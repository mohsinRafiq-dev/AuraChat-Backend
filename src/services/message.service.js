import mongoose from 'mongoose';
import { Message } from '../models/Message.model.js';
import { User } from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';
import * as conversationService from './conversation.service.js';

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw AppError.badRequest('Invalid id');
  }
  return new mongoose.Types.ObjectId(id);
}

export async function createMessageInConversation({
  conversationId,
  senderId,
  recipientId,
  text,
  clientId,
  type,
  mediaUrl,
  mediaThumbnail,
  mediaType,
  mediaSize,
  mediaName,
  mediaDuration,
  replyTo,
  isForwarded,
  forwardedFrom
}) {
  const conversation = await conversationService.findConversationForUser(conversationId, senderId);
  const sid = String(senderId);
  const participants = conversation.participants.map((p) => String(p._id));

  if (!participants.includes(sid)) {
    throw AppError.forbidden('Sender is not part of this conversation');
  }

  if (!conversation.isGroup) {
    const rid = recipientId ? String(recipientId) : null;
    if (rid && !participants.includes(rid)) {
      throw AppError.forbidden('Recipient is not part of this conversation');
    }
  }

  const convoOid = toObjectId(conversationId);
  const senderOid = toObjectId(senderId);
  const recipientOid = !conversation.isGroup && recipientId ? toObjectId(recipientId) : null;
  const cid = clientId?.trim() || undefined;

  if (cid) {
    const pre = await Message.findOne({
      conversationId: convoOid,
      clientId: cid,
      senderId: senderOid
    });
    if (pre) return { doc: pre, reused: true };
  }

  const msgData = {
    conversationId: convoOid,
    senderId: senderOid,
    recipientId: recipientOid,
    text: text ?? '',
    clientId: cid,
    type: type ?? 'text'
  };

  if (mediaUrl !== undefined) msgData.mediaUrl = mediaUrl;
  if (mediaThumbnail !== undefined) msgData.mediaThumbnail = mediaThumbnail;
  if (mediaType !== undefined) msgData.mediaType = mediaType;
  if (mediaSize !== undefined) msgData.mediaSize = mediaSize;
  if (mediaName !== undefined) msgData.mediaName = mediaName;
  if (mediaDuration !== undefined) msgData.mediaDuration = mediaDuration;
  if (replyTo !== undefined) msgData.replyTo = replyTo;
  if (isForwarded !== undefined) msgData.isForwarded = isForwarded;
  if (forwardedFrom !== undefined) msgData.forwardedFrom = forwardedFrom;

  try {
    const doc = await Message.create(msgData);

    await conversationService.updateLastMessage(conversation._id, {
      text: doc.text,
      type: doc.type,
      senderId: doc.senderId,
      createdAt: doc.createdAt
    });

    return { doc, reused: false };
  } catch (e) {
    if (e?.code === 11000 && cid) {
      const existing = await Message.findOne({
        conversationId: convoOid,
        clientId: cid,
        senderId: senderOid
      });
      if (existing) return { doc: existing, reused: true };
    }
    throw e;
  }
}

export async function listMessagesForUser(conversationId, userId, { limit = 50, before } = {}) {
  await conversationService.findConversationForUser(conversationId, userId);
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const fetchN = lim + 1;
  const uid = toObjectId(userId);

  const filter = {
    conversationId: toObjectId(conversationId),
    deletedFor: { $ne: uid }
  };

  if (before) {
    const anchor = await Message.findOne({
      _id: toObjectId(before),
      conversationId: filter.conversationId
    })
      .select('createdAt')
      .lean();
    if (anchor) {
      filter.createdAt = { $lt: anchor.createdAt };
    }
  }

  const rows = await Message.find(filter).sort({ createdAt: -1 }).limit(fetchN).lean();
  const hasMore = rows.length > lim;
  const slice = hasMore ? rows.slice(0, lim) : rows;
  return { messages: slice.reverse(), hasMore };
}

export async function editMessage(messageId, userId, newText) {
  if (!newText?.trim()) throw AppError.badRequest('Text cannot be empty');
  const msg = await Message.findById(toObjectId(messageId));
  if (!msg) throw AppError.notFound('Message not found');
  if (String(msg.senderId) !== String(userId)) throw AppError.forbidden('Not your message');
  if (msg.isDeleted) throw AppError.badRequest('Cannot edit a deleted message');

  msg.editHistory.push({ text: msg.text, editedAt: new Date() });
  msg.text = newText.trim();
  msg.editedAt = new Date();
  await msg.save();
  return msg;
}

export async function deleteMessage(messageId, userId, deleteForEveryone) {
  const msg = await Message.findById(toObjectId(messageId));
  if (!msg) throw AppError.notFound('Message not found');

  if (deleteForEveryone) {
    if (String(msg.senderId) !== String(userId)) throw AppError.forbidden('Only sender can delete for everyone');
    msg.isDeleted = true;
    msg.deletedForEveryone = true;
    msg.text = 'This message was deleted';
  } else {
    const uid = toObjectId(userId);
    if (!msg.deletedFor.some((id) => String(id) === String(userId))) {
      msg.deletedFor.push(uid);
    }
  }
  await msg.save();
  return msg;
}

export async function reactToMessage(messageId, userId, emoji) {
  const msg = await Message.findById(toObjectId(messageId));
  if (!msg) throw AppError.notFound('Message not found');

  const idx = msg.reactions.findIndex((r) => String(r.userId) === String(userId));
  if (!emoji) {
    if (idx !== -1) msg.reactions.splice(idx, 1);
  } else {
    if (idx !== -1) {
      msg.reactions[idx].emoji = emoji;
    } else {
      msg.reactions.push({ userId: toObjectId(userId), emoji });
    }
  }
  await msg.save();
  return msg;
}

export async function pinMessage(messageId, conversationId, userId) {
  await conversationService.findConversationForUser(conversationId, userId);
  const msg = await Message.findByIdAndUpdate(
    toObjectId(messageId),
    { isPinned: true },
    { new: true }
  );
  if (!msg) throw AppError.notFound('Message not found');
  const { Conversation } = await import('../models/Conversation.model.js');
  await Conversation.findByIdAndUpdate(conversationId, {
    $addToSet: { pinnedMessages: toObjectId(messageId) }
  });
  return msg;
}

export async function unpinMessage(messageId, conversationId, userId) {
  await conversationService.findConversationForUser(conversationId, userId);
  const msg = await Message.findByIdAndUpdate(
    toObjectId(messageId),
    { isPinned: false },
    { new: true }
  );
  if (!msg) throw AppError.notFound('Message not found');
  const { Conversation } = await import('../models/Conversation.model.js');
  await Conversation.findByIdAndUpdate(conversationId, {
    $pull: { pinnedMessages: toObjectId(messageId) }
  });
  return msg;
}

export async function starMessage(messageId, userId) {
  const msgOid = toObjectId(messageId);
  const uid = toObjectId(userId);
  await Message.findByIdAndUpdate(msgOid, { $addToSet: { starredBy: uid } });
  await User.findByIdAndUpdate(uid, { $addToSet: { starredMessages: msgOid } });
}

export async function unstarMessage(messageId, userId) {
  const msgOid = toObjectId(messageId);
  const uid = toObjectId(userId);
  await Message.findByIdAndUpdate(msgOid, { $pull: { starredBy: uid } });
  await User.findByIdAndUpdate(uid, { $pull: { starredMessages: msgOid } });
}

export async function getStarredMessages(userId) {
  const user = await User.findById(userId).select('starredMessages');
  if (!user) throw AppError.notFound('User not found');
  const msgs = await Message.find({ _id: { $in: user.starredMessages } })
    .sort({ createdAt: -1 })
    .lean();
  return msgs;
}

export async function searchMessages(userId, query, conversationId) {
  if (!query?.trim()) return [];
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');
  const uid = toObjectId(userId);

  const filter = {
    text: regex,
    deletedFor: { $ne: uid },
    isDeleted: { $ne: true }
  };

  if (conversationId) {
    await conversationService.findConversationForUser(conversationId, userId);
    filter.conversationId = toObjectId(conversationId);
  } else {
    const { Conversation } = await import('../models/Conversation.model.js');
    const convos = await Conversation.find({ participants: uid }).select('_id').lean();
    filter.conversationId = { $in: convos.map((c) => c._id) };
  }

  return Message.find(filter).sort({ createdAt: -1 }).limit(50).lean();
}

export async function markDelivered(messageId) {
  await Message.findByIdAndUpdate(messageId, { deliveredAt: new Date() });
}

export async function markRead(messageId) {
  await Message.findByIdAndUpdate(messageId, { readAt: new Date() });
}

export async function markConversationRead(conversationId, recipientId) {
  const convoOid = toObjectId(conversationId);
  const uid = toObjectId(recipientId);
  const now = new Date();

  // For group conversations: add to readBy array
  await Message.updateMany(
    {
      conversationId: convoOid,
      senderId: { $ne: uid },
      'readBy.userId': { $ne: uid }
    },
    { $push: { readBy: { userId: uid, readAt: now } } }
  );

  // For 1:1: also set readAt
  const result = await Message.updateMany(
    {
      conversationId: convoOid,
      recipientId: uid,
      readAt: { $exists: false }
    },
    { readAt: now }
  );

  if (result.modifiedCount === 0) {
    // might be group — still return updated messages
    const updated = await Message.find(
      {
        conversationId: convoOid,
        'readBy.userId': uid
      },
      '_id senderId'
    ).lean();
    return updated;
  }

  const updated = await Message.find(
    {
      conversationId: convoOid,
      recipientId: uid,
      readAt: { $exists: true }
    },
    '_id senderId'
  ).lean();
  return updated;
}
