import mongoose from 'mongoose';
import { Message } from '../models/Message.model.js';
import { AppError } from '../utils/AppError.js';
import * as conversationService from './conversation.service.js';

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw AppError.badRequest('Invalid id');
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Persists a message and updates the parent conversation metadata.
 * @returns {{ doc: import('mongoose').Document, reused: boolean }} `reused` when same `clientId` was already stored (idempotent retry).
 */
export async function createMessageInConversation({
  conversationId,
  senderId,
  recipientId,
  text,
  clientId
}) {
  const conversation = await conversationService.findConversationForUser(conversationId, senderId);
  const sid = String(senderId);
  const rid = String(recipientId);
  const participants = conversation.participants.map((p) => String(p._id));
  if (!participants.includes(sid) || !participants.includes(rid)) {
    throw AppError.forbidden('Recipient is not part of this conversation');
  }

  const convoOid = toObjectId(conversationId);
  const senderOid = toObjectId(senderId);
  const recipientOid = toObjectId(recipientId);
  const cid = clientId?.trim() || undefined;

  if (cid) {
    const pre = await Message.findOne({
      conversationId: convoOid,
      clientId: cid,
      senderId: senderOid
    });
    if (pre) {
      return { doc: pre, reused: true };
    }
  }

  try {
    const doc = await Message.create({
      conversationId: convoOid,
      senderId: senderOid,
      recipientId: recipientOid,
      text,
      clientId: cid
    });

    await conversationService.updateLastMessage(conversation._id, {
      text: doc.text,
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
      if (existing) {
        return { doc: existing, reused: true };
      }
    }
    throw e;
  }
}

/**
 * Lists messages oldest→newest. Uses `limit+1` fetch to compute `hasMore`.
 * `before`: Mongo ObjectId of the oldest message already on the client (fetch older page).
 */
export async function listMessagesForUser(conversationId, userId, { limit = 50, before } = {}) {
  await conversationService.findConversationForUser(conversationId, userId);
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const fetchN = lim + 1;

  const filter = { conversationId: toObjectId(conversationId) };
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

export async function markDelivered(messageId) {
  await Message.findByIdAndUpdate(messageId, { deliveredAt: new Date() });
}

export async function markRead(messageId) {
  await Message.findByIdAndUpdate(messageId, { readAt: new Date() });
}

/**
 * Marks all unread messages in a conversation as read (recipient opening the chat).
 * Returns the list of message IDs that were updated.
 */
export async function markConversationRead(conversationId, recipientId) {
  const result = await Message.updateMany(
    {
      conversationId: toObjectId(conversationId),
      recipientId: toObjectId(recipientId),
      readAt: { $exists: false }
    },
    { readAt: new Date() }
  );
  // Return the IDs so the sender can be notified
  if (result.modifiedCount === 0) return [];
  const updated = await Message.find(
    {
      conversationId: toObjectId(conversationId),
      recipientId: toObjectId(recipientId),
      readAt: { $exists: true }
    },
    '_id senderId'
  ).lean();
  return updated;
}
