import mongoose from 'mongoose';
import { Status } from '../models/Status.model.js';
import { Conversation } from '../models/Conversation.model.js';
import { AppError } from '../utils/AppError.js';

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw AppError.badRequest('Invalid id');
  }
  return new mongoose.Types.ObjectId(id);
}

export async function createStatus(userId, { type, text, mediaUrl, mediaType, backgroundColor, fontStyle }) {
  if (!type) throw AppError.badRequest('Status type is required');
  const uid = toObjectId(userId);
  return Status.create({
    userId: uid,
    type,
    text: text ?? '',
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType ?? null,
    backgroundColor: backgroundColor ?? '#128C7E',
    fontStyle: fontStyle ?? 'normal'
  });
}

export async function getStatusesForUser(currentUserId) {
  const uid = toObjectId(currentUserId);
  const now = new Date();

  // Get contact user IDs (people the current user has convos with)
  const convos = await Conversation.find({ participants: uid }).select('participants').lean();
  const contactIds = new Set();
  for (const c of convos) {
    for (const p of c.participants) {
      const pid = String(p);
      if (pid !== String(currentUserId)) contactIds.add(pid);
    }
  }

  // Include own statuses too
  contactIds.add(String(currentUserId));

  const contactOids = [...contactIds].map((id) => toObjectId(id));
  return Status.find({
    userId: { $in: contactOids },
    expiresAt: { $gt: now }
  })
    .sort({ createdAt: -1 })
    .populate('userId', 'email username avatarUrl')
    .lean();
}

export async function markStatusViewed(statusId, viewerId) {
  const vid = toObjectId(viewerId);
  const status = await Status.findById(toObjectId(statusId));
  if (!status) throw AppError.notFound('Status not found');
  if (!status.viewers.some((v) => String(v.userId) === String(viewerId))) {
    status.viewers.push({ userId: vid, viewedAt: new Date() });
    await status.save();
  }
  return status;
}

export async function deleteStatus(statusId, userId) {
  const status = await Status.findById(toObjectId(statusId));
  if (!status) throw AppError.notFound('Status not found');
  if (String(status.userId) !== String(userId)) {
    throw AppError.forbidden('Cannot delete another user\'s status');
  }
  await Status.deleteOne({ _id: status._id });
}
