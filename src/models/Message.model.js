import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true, maxlength: 10 }
  },
  { _id: false }
);

const replySnapshotSchema = new mongoose.Schema(
  {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, maxlength: 200 },
    type: { type: String, default: 'text' },
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, default: null }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // For 1:1 messages; for group messages this holds all non-sender participant IDs
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    /** Message type */
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker', 'system', 'voice'],
      default: 'text'
    },
    text: {
      type: String,
      trim: true,
      maxlength: 8000,
      default: ''
    },
    /** Media fields */
    mediaUrl: { type: String, default: null, maxlength: 2048 },
    mediaThumbnail: { type: String, default: null, maxlength: 2048 },
    mediaType: { type: String, default: null, maxlength: 128 },
    mediaSize: { type: Number, default: null },
    mediaName: { type: String, default: null, maxlength: 256 },
    mediaDuration: { type: Number, default: null },  // seconds, for audio/video
    mediaWidth: { type: Number, default: null },
    mediaHeight: { type: Number, default: null },
    /** Location fields */
    location: {
      lat: { type: Number },
      lng: { type: Number },
      label: { type: String, maxlength: 256 }
    },
    /** Reply-to snapshot */
    replyTo: { type: replySnapshotSchema, default: null },
    /** For forwarded messages */
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    isForwarded: { type: Boolean, default: false },
    /** Edit tracking */
    editedAt: { type: Date, default: null },
    editHistory: [
      {
        text: { type: String, maxlength: 8000 },
        editedAt: { type: Date }
      }
    ],
    /** Soft delete */
    isDeleted: { type: Boolean, default: false },
    deletedForEveryone: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** Reactions: one per user (upsert by userId) */
    reactions: { type: [reactionSchema], default: [] },
    /** Starred by which users */
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** Pinned in conversation */
    isPinned: { type: Boolean, default: false },
    /** Delivery & read receipts */
    clientId: { type: String, trim: true, maxlength: 128, default: undefined },
    deliveredAt: { type: Date, default: undefined },
    readAt: { type: Date, default: undefined },
    /** For group messages: per-member read/delivered status */
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date }
      }
    ],
    deliveredTo: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deliveredAt: { type: Date }
      }
    ],
    /** Disappearing messages */
    expiresAt: { type: Date, default: null, index: { expireAfterSeconds: 0, sparse: true } }
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, isPinned: 1 });
messageSchema.index({ conversationId: 1, 'starredBy': 1 });
messageSchema.index(
  { conversationId: 1, clientId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientId: { $exists: true, $type: 'string', $gt: '' } }
  }
);

export const Message = mongoose.model('Message', messageSchema);
