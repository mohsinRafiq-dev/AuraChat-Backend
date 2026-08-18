import mongoose from 'mongoose';
import { Conversation } from '../../models/Conversation.model.js';
import { Message } from '../../models/Message.model.js';
import { SOCKET_EVENTS } from '../../constants/socketEvents.js';
import { presenceRegistry } from '../../services/presence.service.js';
import { markDelivered } from '../../services/message.service.js';
import { updateLastSeen } from '../../services/user.service.js';
import { registerMessageHandlers } from './message.handler.js';
import { registerTypingHandlers } from './typing.handler.js';
import { registerAssistantHandlers } from './assistant.handler.js';

/**
 * Collect all unique participant IDs across the user's conversations,
 * excluding the user themselves.
 */
async function getConversationPartnerIds(userId) {
  const convos = await Conversation.find({ participants: userId })
    .select('participants')
    .lean();
  const partners = new Set();
  for (const c of convos) {
    for (const p of c.participants) {
      const pid = String(p);
      if (pid !== String(userId)) partners.add(pid);
    }
  }
  return [...partners];
}

/**
 * Per-socket lifecycle: presence, room joins, handler registration, `disconnect` cleanup.
 */
export async function wireConnection(io, socket) {
  const userId = socket.userId;

  presenceRegistry.addSocket(userId, socket.id);
  socket.join(`user:${userId}`);

  /**
   * Attach event handlers before any awaiting.
   *
   * The client's `connect` fires as soon as the handshake completes, so it can
   * emit immediately. Everything below this point awaits the database, and an
   * event that arrives before its listener exists is dropped by Socket.IO
   * silently — no error, no ack, the message simply disappears. Registering
   * first closes that window; the handlers only read `socket.userId`, which is
   * already set by the auth middleware.
   */
  registerMessageHandlers(io, socket);
  registerTypingHandlers(io, socket);
  registerAssistantHandlers(io, socket);

  // Join all existing conversation rooms
  const list = await Conversation.find({ participants: userId }).select('_id participants').lean();
  for (const c of list) {
    socket.join(`conversation:${c._id}`);
  }

  // Notify conversation partners that this user is now online
  const partnerIds = await getConversationPartnerIds(userId);
  for (const partnerId of partnerIds) {
    io.to(`user:${partnerId}`).emit(SOCKET_EVENTS.USER_ONLINE, { userId });
  }

  // Send the newly connected user a snapshot of which partners are already online
  const onlinePartnerIds = partnerIds.filter((pid) => presenceRegistry.isUserOnline(pid));
  socket.emit(SOCKET_EVENTS.USER_PRESENCE_SNAPSHOT, { onlineUserIds: onlinePartnerIds });

  // Upgrade any messages sent while user was offline from 'sent' → 'delivered'
  // and notify the senders so their tick upgrades from single → double grey
  try {
    const pending = await Message.find({
      recipientId: userId,
      deliveredAt: { $exists: false }
    }).select('_id senderId conversationId').lean();

    for (const msg of pending) {
      await markDelivered(msg._id);
      io.to(`user:${String(msg.senderId)}`).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
        conversationId: String(msg.conversationId),
        messageId: String(msg._id),
        status: 'delivered'
      });
    }
  } catch (err) {
    console.error('offline-delivered upgrade failed', err);
  }

  socket.on(SOCKET_EVENTS.USER_ONLINE, () => {
    presenceRegistry.addSocket(userId, socket.id);
  });

  /** Lets clients refresh conversation rooms after creating a thread over REST. */
  socket.on('sync_conversations', async () => {
    try {
      const refreshed = await Conversation.find({ participants: userId }).select('_id').lean();
      for (const c of refreshed) {
        socket.join(`conversation:${c._id}`);
      }
    } catch (err) {
      console.error('sync_conversations failed', err);
    }
  });

  socket.on('disconnect', async (_reason) => {
    presenceRegistry.removeSocket(socket.id);

    // Only go offline once the user's *last* socket closes — a second tab or
    // a phone still counts as online.
    if (!presenceRegistry.isUserOnline(userId)) {
      const lastSeen = new Date();

      // During shutdown, `io.disconnectSockets()` fires these handlers without
      // awaiting them, so the database can already be closing by the time we
      // get here. Writing then throws MongoNotConnectedError and logs a stack
      // for every connected user on every restart. There is nothing useful to
      // persist or broadcast at that point.
      if (mongoose.connection.readyState !== 1) return;

      try {
        // Persist first, so a partner who loads the app a moment later reads
        // the same timestamp the live event carried.
        await updateLastSeen(userId).catch((err) =>
          console.error('lastSeen persist failed', err)
        );

        const offlinePartnerIds = await getConversationPartnerIds(userId);
        const iso = lastSeen.toISOString();
        for (const partnerId of offlinePartnerIds) {
          io.to(`user:${partnerId}`).emit(SOCKET_EVENTS.USER_OFFLINE, { userId, lastSeen: iso });
          // Carries the timestamp so peers can render "last seen just now"
          // immediately, instead of falling back to a bare "offline" until
          // the next full conversation fetch.
          io.to(`user:${partnerId}`).emit(SOCKET_EVENTS.USER_LAST_SEEN, { userId, lastSeen: iso });
        }
      } catch (err) {
        console.error('presence offline broadcast failed', err);
      }
    }
  });
}
