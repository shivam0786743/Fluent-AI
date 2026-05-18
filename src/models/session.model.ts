import mongoose, { Schema, type Document } from 'mongoose';

export interface ISession extends Document {
  topic_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  mode: 'vocabulary' | 'reading' | 'speaking' | 'interview';
  grammar_score?: number;
  vocabulary_score?: number;
  pronunciation_score?: number;
  fluency_score?: number;
  duration_minutes?: number;
  status: 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema: Schema = new Schema(
  {
    topic_id: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mode: {
      type: String,
      enum: ['vocabulary', 'reading', 'speaking', 'interview'],
      required: true,
    },
    grammar_score: {
      type: Number,
      min: 0,
      max: 100,
    },
    vocabulary_score: {
      type: Number,
      min: 0,
      max: 100,
    },
    pronunciation_score: {
      type: Number,
      min: 0,
      max: 100,
    },
    fluency_score: {
      type: Number,
      min: 0,
      max: 100,
    },
    duration_minutes: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISession>('Session', SessionSchema);
