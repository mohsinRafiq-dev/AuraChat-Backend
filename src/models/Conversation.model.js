import mongoose from 'mongoose';

const lastMessageSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 8000 },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, required: true }
  },
  { _id: false }
);

/**
 * Direct (1:1) thread. `participants` always length 2 for this app version.
 */
const conversationSchema = new mongoose.Schema(
  {
    /** Stable pair key `minId:maxId` for uniqueness on 1:1 threads. */
    dmKey: { type: String, required: true, unique: true, index: true },
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: [(v) => Array.isArray(v) && v.length === 2, 'Exactly two participants']
    },
    lastMessage: { type: lastMessageSchema, default: undefined }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
