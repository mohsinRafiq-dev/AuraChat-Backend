import { SOCKET_EVENTS } from '../../constants/socketEvents.js';
import { SlidingWindowLimiter } from '../socketRateLimit.js';
import { runAuraTask, isAssistantConfigured } from '../../services/assistant.service.js';
import { User } from '../../models/User.model.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Assistant calls are far more expensive than messages, so they get their own
 * budget rather than sharing the message limiter.
 */
const auraLimiter = new SlidingWindowLimiter();
const AURA_MAX_PER_MIN = 8;
const AURA_WINDOW_MS = 60_000;

/** One in-flight run per socket — prevents a click-spamming client from fanning out calls. */
const inFlight = new Set();

function ackOrNoop(cb) {
  return typeof cb === 'function' ? cb : () => {};
}

/**
 * `assistant:run` → streams `assistant:start` → `assistant:delta`* → `assistant:done`.
 *
 * The reply rides the socket the client already holds open, so there is no
 * second transport, no polling, and no SSE endpoint to authenticate separately.
 */
export function registerAssistantHandlers(io, socket) {
  socket.on(SOCKET_EVENTS.ASSISTANT_RUN, async (payload, ack) => {
    const respond = ackOrNoop(ack);
    const userId = socket.userId;
    const { task, conversationId, question, runId } = payload || {};

    const fail = (error, code) => {
      socket.emit(SOCKET_EVENTS.ASSISTANT_ERROR, { runId, conversationId, error });
      respond({ success: false, error, code });
    };

    try {
      if (!isAssistantConfigured()) {
        return fail('Aura is unavailable right now.', 503);
      }
      if (!conversationId || !task) {
        return fail('conversationId and task are required', 400);
      }
      if (inFlight.has(socket.id)) {
        return fail('Aura is still working on your last request.', 409);
      }
      if (!auraLimiter.hit(`aura:${userId}`, AURA_MAX_PER_MIN, AURA_WINDOW_MS)) {
        return fail('You are asking Aura a lot. Give it a minute.', 429);
      }

      const user = await User.findById(userId).select('username email').lean();
      const viewerName = user?.username || user?.email?.split('@')[0] || 'You';

      inFlight.add(socket.id);
      socket.emit(SOCKET_EVENTS.ASSISTANT_START, { runId, conversationId, task });

      const { text, messageCount } = await runAuraTask({
        task,
        conversationId,
        userId,
        viewerName,
        question,
        onDelta: (delta) => {
          socket.emit(SOCKET_EVENTS.ASSISTANT_DELTA, { runId, conversationId, delta });
        }
      });

      socket.emit(SOCKET_EVENTS.ASSISTANT_DONE, { runId, conversationId, text, messageCount });
      respond({ success: true, text, messageCount });
    } catch (err) {
      const isKnown = err instanceof AppError;
      if (!isKnown) console.error('[aura] run failed', err);
      fail(
        isKnown ? err.message : 'Aura could not finish that. Try again.',
        isKnown ? err.statusCode : 500
      );
    } finally {
      inFlight.delete(socket.id);
    }
  });

  socket.on('disconnect', () => {
    inFlight.delete(socket.id);
  });
}
