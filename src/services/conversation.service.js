import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.model.js';
import { Message } from '../models/Message.model.js';
import { AppError } from '../utils/AppError.js';

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw AppError.badRequest('Invalid id');
  }
  return new mongoose.Types.ObjectId(id);
}

const PARTICIPANT_POPULATE = 'email username avatarUrl bio statusMessage lastSeen phone';

export async function findConversationForUser(conversationId, userId) {
  const convoId = toObjectId(conversationId);
  const uid = toObjectId(userId);
  const conversation = await Conversation.findOne({
    _id: convoId,
    participants: uid
  }).populate('participants', PARTICIPANT_POPULATE);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }
  return conversation;
}

export async function listConversationsForUser(userId) {
  const uid = toObjectId(userId);
  const convos = await Conversation.find({ participants: uid })
    .sort({ updatedAt: -1 })
    .populate('participants', PARTICIPANT_POPULATE);

  const withUnread = await Promise.all(
    convos.map(async (c) => {
      let unreadCount;
      if (c.isGroup) {
        unreadCount = await Message.countDocuments({
          conversationId: c._id,
          senderId: { $ne: uid },
          'readBy.userId': { $ne: uid }
        });
      } else {
        unreadCount = await Message.countDocuments({
          conversationId: c._id,
          recipientId: uid,
          readAt: { $exists: false }
        });
      }
      const obj = c.toObject ? c.toObject() : c;
      obj.unreadCount = unreadCount;
      return obj;
    })
  );
  return withUnread;
}

function dmKeyFor(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}:${y}` : `${y}:${x}`;
}

export async function findOrCreateDirectConversation(currentUserId, otherUserId) {
  if (String(currentUserId) === String(otherUserId)) {
    throw AppError.badRequest('Cannot start a conversation with yourself');
  }
  const a = toObjectId(currentUserId);
  const b = toObjectId(otherUserId);
  const dmKey = dmKeyFor(a, b);
  const existing = await Conversation.findOne({ dmKey }).populate('participants', PARTICIPANT_POPULATE);
  if (existing) return existing;
  try {
    const created = await Conversation.create({ dmKey, participants: [a, b] });
    return Conversation.findById(created._id).populate('participants', PARTICIPANT_POPULATE);
  } catch (e) {
    if (e?.code === 11000) {
      return Conversation.findOne({ dmKey }).populate('participants', PARTICIPANT_POPULATE);
    }
    throw e;
  }
}

export async function updateLastMessage(
  conversationId,
  { text, type, senderId, createdAt, messageId, status }
) {
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: {
      text,
      type: type ?? 'text',
      senderId,
      createdAt,
      messageId: messageId ?? null,
      status: status ?? 'sent'
    },
    updatedAt: new Date()
  });
}

/**
 * Advances the delivery status shown against a conversation's last message.
 *
 * Scoped by `lastMessage.messageId` so a status change on an older message is
 * ignored — the preview should only ever reflect the newest one.
 */
export async function updateLastMessageStatus(messageId, status) {
  if (!messageId) return;
  await Conversation.updateOne(
    { 'lastMessage.messageId': toObjectId(messageId) },
    { $set: { 'lastMessage.status': status } }
  );
}

export async function deleteConversationForUser(conversationId, userId) {
  const convoId = toObjectId(conversationId);
  const uid = toObjectId(userId);
  const conversation = await Conversation.findOne({ _id: convoId, participants: uid });
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }
  await Message.deleteMany({ conversationId: convoId });
  await Conversation.deleteOne({ _id: convoId });
}

export async function createGroupConversation(creatorId, { name, description, participantIds, avatarUrl }) {
  if (!name?.trim()) throw AppError.badRequest('Group name is required');
  const creatorOid = toObjectId(creatorId);
  const participantOids = [creatorOid];
  for (const pid of (participantIds || [])) {
    const oid = toObjectId(pid);
    if (String(oid) !== String(creatorOid)) {
      participantOids.push(oid);
    }
  }
  if (participantOids.length < 2) throw AppError.badRequest('At least one other participant required');

  const created = await Conversation.create({
    isGroup: true,
    groupName: name.trim(),
    groupDescription: description?.trim() || '',
    groupAvatar: avatarUrl || null,
    participants: participantOids,
    admins: [creatorOid],
    createdBy: creatorOid,
    dmKey: null
  });
  return Conversation.findById(created._id).populate('participants', PARTICIPANT_POPULATE);
}

export async function updateGroupInfo(conversationId, userId, { name, description, avatarUrl }) {
  const convo = await Conversation.findById(toObjectId(conversationId));
  if (!convo) throw AppError.notFound('Group not found');
  if (!convo.isGroup) throw AppError.badRequest('Not a group');
  if (!convo.admins.some((a) => String(a) === String(userId))) {
    throw AppError.forbidden('Only admins can update group info');
  }
  const updates = {};
  if (name !== undefined) updates.groupName = name.trim();
  if (description !== undefined) updates.groupDescription = description.trim();
  if (avatarUrl !== undefined) updates.groupAvatar = avatarUrl;
  return Conversation.findByIdAndUpdate(conversationId, { $set: updates }, { new: true })
    .populate('participants', PARTICIPANT_POPULATE);
}

export async function addGroupMember(conversationId, userId, newMemberId) {
  const convo = await Conversation.findById(toObjectId(conversationId));
  if (!convo) throw AppError.notFound('Group not found');
  if (!convo.isGroup) throw AppError.badRequest('Not a group');
  if (!convo.admins.some((a) => String(a) === String(userId))) {
    throw AppError.forbidden('Only admins can add members');
  }
  const newOid = toObjectId(newMemberId);
  if (convo.participants.some((p) => String(p) === String(newOid))) {
    throw AppError.badRequest('User is already a member');
  }
  return Conversation.findByIdAndUpdate(
    conversationId,
    { $push: { participants: newOid } },
    { new: true }
  ).populate('participants', PARTICIPANT_POPULATE);
}

export async function removeGroupMember(conversationId, userId, memberToRemoveId) {
  const convo = await Conversation.findById(toObjectId(conversationId));
  if (!convo) throw AppError.notFound('Group not found');
  if (!convo.isGroup) throw AppError.badRequest('Not a group');
  const isAdmin = convo.admins.some((a) => String(a) === String(userId));
  const isSelf = String(userId) === String(memberToRemoveId);
  if (!isAdmin && !isSelf) {
    throw AppError.forbidden('Only admins can remove members');
  }
  return Conversation.findByIdAndUpdate(
    conversationId,
    { $pull: { participants: toObjectId(memberToRemoveId), admins: toObjectId(memberToRemoveId) } },
    { new: true }
  ).populate('participants', PARTICIPANT_POPULATE);
}

export async function leaveGroup(conversationId, userId) {
  const convo = await Conversation.findById(toObjectId(conversationId));
  if (!convo) throw AppError.notFound('Group not found');
  if (!convo.isGroup) throw AppError.badRequest('Not a group');
  const uid = toObjectId(userId);

  const remaining = convo.participants.filter((p) => String(p) !== String(userId));
  if (remaining.length === 0) {
    await Conversation.deleteOne({ _id: convo._id });
    return null;
  }

  const wasAdmin = convo.admins.some((a) => String(a) === String(userId));
  const updates = { $pull: { participants: uid, admins: uid } };

  // If last admin leaving, promote next member
  const remainingAdmins = convo.admins.filter((a) => String(a) !== String(userId));
  if (wasAdmin && remainingAdmins.length === 0 && remaining.length > 0) {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { $pull: { participants: uid, admins: uid }, $push: { admins: remaining[0] } },
      { new: true }
    ).populate('participants', PARTICIPANT_POPULATE);
  }

  return Conversation.findByIdAndUpdate(conversationId, updates, { new: true })
    .populate('participants', PARTICIPANT_POPULATE);
}

export async function changeGroupAdmin(conversationId, userId, targetId, makeAdmin) {
  const convo = await Conversation.findById(toObjectId(conversationId));
  if (!convo) throw AppError.notFound('Group not found');
  if (!convo.isGroup) throw AppError.badRequest('Not a group');
  if (!convo.admins.some((a) => String(a) === String(userId))) {
    throw AppError.forbidden('Only admins can change admin status');
  }
  const targetOid = toObjectId(targetId);
  if (!convo.participants.some((p) => String(p) === String(targetId))) {
    throw AppError.badRequest('Target is not a member');
  }
  const op = makeAdmin
    ? { $addToSet: { admins: targetOid } }
    : { $pull: { admins: targetOid } };
  return Conversation.findByIdAndUpdate(conversationId, op, { new: true })
    .populate('participants', PARTICIPANT_POPULATE);
}

export async function archiveConversation(conversationId, userId) {
  const uid = toObjectId(userId);
  await findConversationForUser(conversationId, userId);
  await Conversation.findByIdAndUpdate(conversationId, { $addToSet: { archivedBy: uid } });
}

export async function unarchiveConversation(conversationId, userId) {
  const uid = toObjectId(userId);
  await findConversationForUser(conversationId, userId);
  await Conversation.findByIdAndUpdate(conversationId, { $pull: { archivedBy: uid } });
}

export async function setDisappearingMessages(conversationId, userId, { enabled, duration }) {
  const convo = await findConversationForUser(conversationId, userId);
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      'disappearingMessages.enabled': Boolean(enabled),
      'disappearingMessages.duration': Number(duration) || 86400,
      'disappearingMessages.setBy': toObjectId(userId),
      'disappearingMessages.setAt': new Date()
    }
  });
}
