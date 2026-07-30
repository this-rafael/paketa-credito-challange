import type { Logger } from 'pino';
import type { MenuItemIdGenerator } from '../../application/ports/id-generator.js';
import { InvalidMenuItemIdError } from '../../domain/menu/menu-errors.js';
import { CounterModel } from './mongoose/counter-model.js';

const COUNTER_ID = 'menu-item';

export class MongoIdGenerator implements MenuItemIdGenerator {
  constructor(private readonly logger?: Logger) {}

  async next(): Promise<number> {
    const counter = await CounterModel.findOneAndUpdate(
      { _id: COUNTER_ID },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );

    const seq = counter?.seq;
    if (!Number.isSafeInteger(seq) || seq === undefined || seq <= 0) {
      this.logger?.error(
        { seq, alert: 'MAX_SAFE_INTEGER' },
        'refusing unsafe menu item id above MAX_SAFE_INTEGER',
      );
      throw new InvalidMenuItemIdError(seq);
    }

    return seq;
  }
}
