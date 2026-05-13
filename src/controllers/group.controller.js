import * as conversationService from '../services/conversation.service.js';
import { serializeConversation } from '../utils/serializers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const createGroup = asyncHandler(async (req, res) => {
  const { name, description, participantIds, avatarUrl } = req.body;
  if (!name?.trim()) throw AppError.badRequest('name is required');
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw AppError.badRequest('participantIds must be a non-empty array');
  }
  const convo = await conversationService.createGroupConversation(req.userId, {
    name,
    description,
    participantIds,
    avatarUrl
  });
  res.status(201).json({ conversation: serializeConversation(convo, req.userId) });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, avatarUrl } = req.body;
  const convo = await conversationService.updateGroupInfo(id, req.userId, { name, description, avatarUrl });
  res.json({ conversation: serializeConversation(convo, req.userId) });
});

export const addMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) throw AppError.badRequest('userId is required');
  const convo = await conversationService.addGroupMember(id, req.userId, userId);
  res.json({ conversation: serializeConversation(convo, req.userId) });
});

export const removeMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const convo = await conversationService.removeGroupMember(id, req.userId, userId);
  res.json({ conversation: serializeConversation(convo, req.userId) });
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const convo = await conversationService.leaveGroup(id, req.userId);
  res.json({ success: true, conversation: convo ? serializeConversation(convo, req.userId) : null });
});

export const changeAdmin = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const { makeAdmin } = req.body;
  if (makeAdmin === undefined) throw AppError.badRequest('makeAdmin is required');
  const convo = await conversationService.changeGroupAdmin(id, req.userId, userId, Boolean(makeAdmin));
  res.json({ conversation: serializeConversation(convo, req.userId) });
});
