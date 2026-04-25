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
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    /** Google `sub` claim; set when the user has signed in with Google at least once. */
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
    }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
