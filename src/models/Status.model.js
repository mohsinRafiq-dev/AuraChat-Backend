import mongoose from 'mongoose';

const statusViewerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    viewedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const statusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    text: { type: String, maxlength: 700, default: '' },
    mediaUrl: { type: String, maxlength: 2048, default: null },
    mediaType: { type: String, maxlength: 128, default: null },
    backgroundColor: { type: String, maxlength: 20, default: '#128C7E' },
    fontStyle: { type: String, default: 'normal' },
    viewers: { type: [statusViewerSchema], default: [] },
    /** Auto-expire after 24 hours */
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 }
    }
  },
  { timestamps: true }
);

export const Status = mongoose.model('Status', statusSchema);
