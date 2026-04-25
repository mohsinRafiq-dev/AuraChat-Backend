import * as conversationService from '../services/conversation.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/AppError.js';
import { serializeConversation } from '../utils/serializers.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const rows = await conversationService.listConversationsForUser(req.userId);
  const conversations = rows.map((c) => serializeConversation(c, req.userId));
  res.json({ conversations });
});

export const create = asyncHandler(async (req, res) => {
  const { participantId, participantEmail } = req.body;
  let otherId = participantId?.trim();

  if (participantEmail?.trim()) {
    const other = await userService.findPublicUserByEmail(participantEmail);
    if (!other) {
      throw AppError.notFound('No account with that email');
    }
    if (String(other._id) === String(req.userId)) {
      throw AppError.badRequest('Pick someone other than yourself');
    }
    otherId = String(other._id);
  }

  if (!otherId) {
    throw AppError.badRequest('Missing participant');
  }

  const conversation = await conversationService.findOrCreateDirectConversation(req.userId, otherId);
  res.status(201).json({ conversation: serializeConversation(conversation, req.userId) });
});

export const remove = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  await conversationService.deleteConversationForUser(conversationId, req.userId);
  res.status(204).end();
});
