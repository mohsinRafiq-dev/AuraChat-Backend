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

export async function findConversationForUser(conversationId, userId) {
  const convoId = toObjectId(conversationId);
  const uid = toObjectId(userId);
  const conversation = await Conversation.findOne({
    _id: convoId,
    participants: uid
  }).populate('participants', 'email username');
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }
  return conversation;
}

export async function listConversationsForUser(userId) {
  const uid = toObjectId(userId);
  const convos = await Conversation.find({ participants: uid })
    .sort({ updatedAt: -1 })
    .populate('participants', 'email username');

  // Attach unread count for each conversation
  const withUnread = await Promise.all(
    convos.map(async (c) => {
      const unreadCount = await Message.countDocuments({
        conversationId: c._id,
        recipientId: uid,
        readAt: { $exists: false }
      });
      // Attach as a plain property (lean-style override)
      const obj = c.toObject ? c.toObject() : c;
      obj.unreadCount = unreadCount;
      return obj;
    })
  );
  return withUnread;
}

/**
 * Finds or creates a 1:1 conversation between the current user and `otherUserId`.
 */
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
  const existing = await Conversation.findOne({ dmKey }).populate('participants', 'email username');
  if (existing) return existing;
  try {
    const created = await Conversation.create({
      dmKey,
      participants: [a, b]
    });
    return Conversation.findById(created._id).populate('participants', 'email username');
  } catch (e) {
    if (e?.code === 11000) {
      return Conversation.findOne({ dmKey }).populate('participants', 'email username');
    }
    throw e;
  }
}

export async function updateLastMessage(conversationId, { text, senderId, createdAt }) {
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: { text, senderId, createdAt },
    updatedAt: new Date()
  });
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
