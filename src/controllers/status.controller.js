import * as statusService from '../services/status.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

function serializeStatus(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    _id: String(o._id),
    userId: o.userId
      ? (typeof o.userId === 'object' && o.userId._id
          ? { id: String(o.userId._id), username: o.userId.username, avatarUrl: o.userId.avatarUrl }
          : String(o.userId))
      : null,
    type: o.type,
    text: o.text ?? '',
    mediaUrl: o.mediaUrl ?? null,
    mediaType: o.mediaType ?? null,
    backgroundColor: o.backgroundColor ?? '#128C7E',
    fontStyle: o.fontStyle ?? 'normal',
    viewers: (o.viewers || []).map((v) => ({
      userId: String(v.userId),
      viewedAt: v.viewedAt instanceof Date ? v.viewedAt.toISOString() : v.viewedAt
    })),
    expiresAt: o.expiresAt instanceof Date ? o.expiresAt.toISOString() : o.expiresAt,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt
  };
}

export const createStatus = asyncHandler(async (req, res) => {
  const { type, text, mediaUrl, mediaType, backgroundColor, fontStyle } = req.body;
  if (!type) throw AppError.badRequest('type is required');
  const status = await statusService.createStatus(req.userId, {
    type, text, mediaUrl, mediaType, backgroundColor, fontStyle
  });
  res.status(201).json({ status: serializeStatus(status) });
});

export const getStatuses = asyncHandler(async (req, res) => {
  const statuses = await statusService.getStatusesForUser(req.userId);
  res.json({ statuses: statuses.map(serializeStatus) });
});

export const viewStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const status = await statusService.markStatusViewed(id, req.userId);
  res.json({ status: serializeStatus(status) });
});

export const deleteStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await statusService.deleteStatus(id, req.userId);
  res.status(204).end();
});
