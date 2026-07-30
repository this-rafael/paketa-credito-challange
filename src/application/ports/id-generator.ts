export interface MenuItemIdGenerator {
  next(): Promise<number>;
}
