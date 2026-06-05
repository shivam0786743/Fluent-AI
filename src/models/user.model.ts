import mongoose, { Schema, type Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import Counter from './counter.model.js';

export interface IUser extends Document {
  userId?: number;
  phoneNumber: string;
  password: string;
  isVerified: boolean;
  firstName?: string;
  lastName?: string;
  countryCode?: string;
  email?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  native_language?: string;
  daily_goal_minutes?: number;
  notifications_enabled?: boolean;
  dark_mode?: boolean;
  is_premium?: boolean;
  streak_days?: number;
  avatar_url?: string;
  counrycode?: number;
  subscritionId?: string;
  selected_languages?: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    userId: {
      type: Number,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    countryCode: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    native_language: {
      type: String,
    },
    daily_goal_minutes: {
      type: Number,
      default: 10,
    },
    notifications_enabled: {
      type: Boolean,
      default: true,
    },
    dark_mode: {
      type: Boolean,
      default: false,
    },
    is_premium: {
      type: Boolean,
      default: false,
    },
    streak_days: {
      type: Number,
      default: 0,
    },
    avatar_url: {
      type: String,
    },
    counrycode: {
      type: Number,
    },
    subscritionId: {
      type: String,
    },
    selected_languages: {
      type: [String],
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-increment userId and Hash password before saving
UserSchema.pre<IUser>('save', async function () {
  if (this.isNew && !this.userId) {
    const counter = await Counter.findOneAndUpdate(
      { modelName: 'User' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.userId = counter.seq;
  }

  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
