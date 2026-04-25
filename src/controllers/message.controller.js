import * as messageService from '../services/message.service.js';
import { serializeMessage } from '../utils/serializers.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listByConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { limit, before } = req.query;
  const { messages: rows, hasMore } = await messageService.listMessagesForUser(conversationId, req.userId, {
    limit,
    before
  });
  const messages = rows.map((m) => serializeMessage(m));
  res.json({ messages, hasMore });
});
