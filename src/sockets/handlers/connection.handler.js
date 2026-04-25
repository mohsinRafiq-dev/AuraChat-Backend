import { Conversation } from '../../models/Conversation.model.js';
import { Message } from '../../models/Message.model.js';
import { SOCKET_EVENTS } from '../../constants/socketEvents.js';
import { presenceRegistry } from '../../services/presence.service.js';
import { markDelivered } from '../../services/message.service.js';
import { registerMessageHandlers } from './message.handler.js';
import { registerTypingHandlers } from './typing.handler.js';

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

  registerMessageHandlers(io, socket);
  registerTypingHandlers(io, socket);

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

    // Only broadcast offline if the user has no other active sockets
    if (!presenceRegistry.isUserOnline(userId)) {
      try {
        const offlinePartnerIds = await getConversationPartnerIds(userId);
        for (const partnerId of offlinePartnerIds) {
          io.to(`user:${partnerId}`).emit(SOCKET_EVENTS.USER_OFFLINE, { userId });
        }
      } catch (err) {
        console.error('presence offline broadcast failed', err);
      }
    }
  });
}
