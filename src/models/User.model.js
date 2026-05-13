import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 320
    },
    username: {
      type: String,
      trim: true,
      maxlength: 64,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: null,
      sparse: true
    },
    passwordHash: {
      type: String,
      select: false
    },
    googleSub: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: null,
      maxlength: 10000
    },
    /** About / bio */
    bio: {
      type: String,
      trim: true,
      maxlength: 140,
      default: 'Hey there! I am using this app.'
    },
    /** Currently set status emoji + text */
    statusMessage: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },
    /** Last seen timestamp — updated on socket disconnect */
    lastSeen: {
      type: Date,
      default: null
    },
    /** Who can see last seen: everyone | contacts | nobody */
    lastSeenVisibility: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    /** Who can see profile photo */
    avatarVisibility: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    /** Users this user has blocked */
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** Two-step verification */
    twoStepEnabled: { type: Boolean, default: false },
    twoStepPinHash: { type: String, select: false, default: null },
    twoStepEmail: { type: String, default: null },
    /** Push notification subscriptions */
    pushSubscriptions: [
      {
        endpoint: String,
        keys: {
          p256dh: String,
          auth: String
        }
      }
    ],
    /** Starred messages */
    starredMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ username: 'text' });

export const User = mongoose.model('User', userSchema);
