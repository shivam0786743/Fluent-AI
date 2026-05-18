import mongoose, { Schema, type Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  phoneNumber: string;
  password: string;
  email?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  native_language?: string;
  daily_goal_minutes?: number;
  notifications_enabled?: boolean;
  dark_mode?: boolean;
  is_premium?: boolean;
  role?: 'user' | 'admin';
  streak_days?: number;
  avatar_url?: string;
  counrycode?: number;
  subscritionId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
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
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
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
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
UserSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
