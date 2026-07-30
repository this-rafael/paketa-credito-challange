import { Schema, model, type InferSchemaType } from 'mongoose';

const menuItemSchema = new Schema(
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

export type MenuItemDocument = InferSchemaType<typeof menuItemSchema> & {
  _id: unknown;
};

export const MenuItemModel = model('MenuItem', menuItemSchema, 'menu_items');
