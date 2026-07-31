/**
 * @packageDocumentation
 *
 * Mongoose model for the `menu_items` collection, mirroring the domain
 * `MenuItem{ with }unique{ constraints on }id`/`name` and indexes for
 * subtree queries (`parentId{ , }ancestors`).
 */
import { Schema, model, type InferSchemaType } from 'mongoose';

/** Schema of a persisted menu item document. */
export const menuItemSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    parentId: { type: Number, default: null, index: true },
    ancestors: { type: [Number], default: [], index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/** Inferred document type for a menu item. */
export type MenuItemDocument = InferSchemaType<typeof menuItemSchema> & {
  _id: unknown;
};

/** Mongoose model over the `menu_items` collection. */
export const MenuItemModel = model('MenuItem', menuItemSchema, 'menu_items');
