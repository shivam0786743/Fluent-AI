import mongoose, { Schema, type Document } from 'mongoose';

export interface ITopic extends Document {
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_premium: boolean;
  icon_url?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    is_premium: {
      type: Boolean,
      default: false,
    },
    icon_url: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITopic>('Topic', TopicSchema);
