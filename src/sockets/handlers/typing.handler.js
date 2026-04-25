import { ZodError } from 'zod';
import { SOCKET_EVENTS } from '../../constants/socketEvents.js';
import { typingSocketSchema } from '../../validators/schemas.js';
import * as conversationService from '../../services/conversation.service.js';
import { AppError } from '../../utils/AppError.js';
import { typingLimiter } from '../socketRateLimit.js';

const TYPING_MAX_PER_MIN = 60;
const TYPING_WINDOW_MS = 60_000;

/**
 * Lightweight typing fan-out to the other participant(s) in the conversation room.
 * Invalid payloads are ignored (typing is best-effort).
 */
export function registerTypingHandlers(_io, socket) {
  socket.on(SOCKET_EVENTS.TYPING, async (payload) => {
    try {
      const data = typingSocketSchema.parse(payload);
      await conversationService.findConversationForUser(data.conversationId, socket.userId);
      const key = `typing:${socket.userId}:${data.conversationId}`;
      if (!typingLimiter.hit(key, TYPING_MAX_PER_MIN, TYPING_WINDOW_MS)) {
        return;
      }
      socket.to(`conversation:${data.conversationId}`).emit(SOCKET_EVENTS.TYPING, {
        conversationId: data.conversationId,
        userId: socket.userId,
        isTyping: data.isTyping
      });
    } catch (err) {
      if (err instanceof ZodError || err instanceof AppError) return;
      console.error('typing error', err);
    }
  });
}
