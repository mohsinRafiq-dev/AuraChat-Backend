import mongoose from 'mongoose';

const lastMessageSchema = new mongoose.Schema(
  {
    text: { type: String, maxlength: 8000, default: '' },
    type: { type: String, default: 'text' },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, required: true }
  },
  { _id: false }
);

const disappearingMessagesSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    duration: { type: Number, default: 86400 },  // seconds (default: 24h)
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    setAt: { type: Date }
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    /** Stable pair key for 1:1 DMs only. Null for group conversations. */
    dmKey: { type: String, sparse: true, unique: true, index: true, default: null },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: [(v) => Array.isArray(v) && v.length >= 2, 'At least two participants required']
    },
    lastMessage: { type: lastMessageSchema, default: undefined },
    /** Group chat fields */
    isGroup: { type: Boolean, default: false },
    groupName: { type: String, trim: true, maxlength: 100, default: null },
    groupAvatar: { type: String, maxlength: 10000, default: null },
    groupDescription: { type: String, maxlength: 500, default: '' },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Per-user settings (archived, muted) */
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    mutedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        until: { type: Date, default: null }  // null = forever
      }
    ],
    /** Pinned messages (message IDs) */
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    /** Disappearing messages setting */
    disappearingMessages: { type: disappearingMessagesSchema, default: () => ({ enabled: false, duration: 86400 }) }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ isGroup: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
