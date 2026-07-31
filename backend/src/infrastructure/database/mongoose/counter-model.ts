/**
 * @packageDocumentation
 *
 * Mongoose model for the sequence counter that backs menu item id generation.
 */
import { Schema, model } from 'mongoose';

/** Schema of a single named counter document. */
const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  {
    versionKey: false,
  },
);

/** Mongoose model over the `counters` collection. */
export const CounterModel = model('Counter', counterSchema, 'counters');
