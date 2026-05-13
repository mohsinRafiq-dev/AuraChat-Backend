import * as messageService from '../services/message.service.js';
import { serializeMessage } from '../utils/serializers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

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

export const editMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text?.trim()) throw AppError.badRequest('text is required');
  const msg = await messageService.editMessage(id, req.userId, text);
  res.json({ message: serializeMessage(msg) });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const forEveryone = req.query.forEveryone === 'true';
  const msg = await messageService.deleteMessage(id, req.userId, forEveryone);
  res.json({ message: serializeMessage(msg) });
});

export const reactToMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;
  if (emoji === undefined) throw AppError.badRequest('emoji is required');
  const msg = await messageService.reactToMessage(id, req.userId, emoji);
  res.json({ message: serializeMessage(msg) });
});

export const pinMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { conversationId } = req.body;
  if (!conversationId) throw AppError.badRequest('conversationId is required');
  const msg = await messageService.pinMessage(id, conversationId, req.userId);
  res.json({ message: serializeMessage(msg) });
});

export const unpinMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { conversationId } = req.body;
  if (!conversationId) throw AppError.badRequest('conversationId is required');
  const msg = await messageService.unpinMessage(id, conversationId, req.userId);
  res.json({ message: serializeMessage(msg) });
});

export const starMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await messageService.starMessage(id, req.userId);
  res.json({ success: true });
});

export const unstarMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await messageService.unstarMessage(id, req.userId);
  res.json({ success: true });
});

export const getStarredMessages = asyncHandler(async (req, res) => {
  const msgs = await messageService.getStarredMessages(req.userId);
  res.json({ messages: msgs.map((m) => serializeMessage(m)) });
});

export const searchMessages = asyncHandler(async (req, res) => {
  const { q, conversationId } = req.query;
  if (!q?.trim()) throw AppError.badRequest('q is required');
  const msgs = await messageService.searchMessages(req.userId, q, conversationId);
  res.json({ messages: msgs.map((m) => serializeMessage(m)) });
});
