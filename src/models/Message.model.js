import mongoose from 'mongoose';

/**
 * Persists chat lines. Emitted to clients only after a successful DB write.
 *
 * - `clientId`: optional id from the client for optimistic UI reconciliation.
 * - `deliveredAt`: set when the server accepts the message for fan-out (not the same as device-level “delivered”).
 * - `readAt`: optional read-receipt time when you implement `mark_read`.
 */
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
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000
    },
    clientId: {
      type: String,
      trim: true,
      maxlength: 128,
      default: undefined
    },
    deliveredAt: { type: Date, default: undefined },
    readAt: { type: Date, default: undefined }
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

/** Idempotent sends: same client retry must not create duplicate rows when `clientId` is present. */
messageSchema.index(
  { conversationId: 1, clientId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientId: { $exists: true, $type: 'string', $gt: '' } }
  }
);

export const Message = mongoose.model('Message', messageSchema);
