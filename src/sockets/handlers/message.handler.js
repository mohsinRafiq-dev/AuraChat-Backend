import { ZodError } from 'zod';
import { SOCKET_EVENTS } from '../../constants/socketEvents.js';
import { sendMessageSocketSchema } from '../../validators/schemas.js';
import { Message } from '../../models/Message.model.js';
import * as messageService from '../../services/message.service.js';
import { serializeMessage } from '../../utils/serializers.js';
import { AppError } from '../../utils/AppError.js';
import { sendMessageLimiter } from '../socketRateLimit.js';
import { presenceRegistry } from '../../services/presence.service.js';

const SEND_MAX_PER_MIN = 120;
const SEND_WINDOW_MS = 60_000;

function ackOrNoop(cb) {
  return typeof cb === 'function' ? cb : () => {};
}

/**
 * `send_message`: validate → persist → emit → ack.
 *
 * Tick logic (WhatsApp-style):
 *   - sent (single grey tick): message saved on server, recipient offline
 *   - delivered (double grey tick): recipient's socket received the message
 *   - read (double blue tick): recipient opened the conversation
 */
export function registerMessageHandlers(io, socket) {
  // ── send_message ──────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload, ack) => {
    const respond = ackOrNoop(ack);
    try {
      const data = sendMessageSocketSchema.parse(payload);
      const senderId = socket.userId;
      if (data.senderId && String(data.senderId) !== String(senderId)) {
        return respond({ success: false, error: 'Sender does not match authenticated user' });
      }

      if (!sendMessageLimiter.hit(`send:${senderId}`, SEND_MAX_PER_MIN, SEND_WINDOW_MS)) {
        return respond({ success: false, error: 'Rate limit exceeded. Slow down.', code: 429 });
      }

      const { doc, reused } = await messageService.createMessageInConversation({
        conversationId: data.conversationId,
        senderId,
        recipientId: data.recipientId,
        text: data.text,
        clientId: data.clientId
      });

      if (!reused) {
        // Only mark delivered if recipient is currently online
        const recipientOnline = presenceRegistry.isUserOnline(String(data.recipientId));
        if (recipientOnline) {
          await messageService.markDelivered(doc._id);
        }
        // If recipient is offline, status stays 'sent' (single tick)
      }

      const stored = await Message.findById(doc._id).lean();
      const message = serializeMessage(stored);

      if (!reused) {
        // Push message to recipient (if online their client receives it)
        io.to(`user:${String(data.recipientId)}`).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, message);

        // Notify sender of the current status (sent OR delivered)
        io.to(`user:${senderId}`).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
          conversationId: message.conversationId,
          messageId: message._id,
          status: message.status  // 'sent' or 'delivered'
        });
      }

      respond({ success: true, message, reused });
    } catch (err) {
      if (err instanceof ZodError) {
        return respond({ success: false, error: 'validation', details: err.flatten() });
      }
      if (err instanceof AppError) {
        return respond({ success: false, error: err.message, code: err.statusCode });
      }
      console.error('send_message error', err);
      return respond({ success: false, error: 'Internal error' });
    }
  });

  // ── mark_read ─────────────────────────────────────────────────────────────
  // Fired by the recipient when they open a conversation.
  socket.on(SOCKET_EVENTS.MARK_READ, async ({ conversationId }) => {
    try {
      const recipientId = socket.userId;
      const updated = await messageService.markConversationRead(conversationId, recipientId);
      if (!updated.length) return;

      // Group by sender and notify each one that their messages were read
      const bySender = new Map();
      for (const msg of updated) {
        const sid = String(msg.senderId);
        if (!bySender.has(sid)) bySender.set(sid, []);
        bySender.get(sid).push(String(msg._id));
      }

      for (const [senderId, messageIds] of bySender) {
        io.to(`user:${senderId}`).emit(SOCKET_EVENTS.MESSAGE_READ, {
          conversationId,
          messageIds
        });
      }
    } catch (err) {
      console.error('mark_read error', err);
    }
  });
}
