import mongoose, { Schema, type Document } from 'mongoose';

export interface ICounter extends Document {
  modelName: string;
  seq: number;
}

const CounterSchema: Schema = new Schema({
  modelName: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model<ICounter>('Counter', CounterSchema);
