/**
 * @packageDocumentation
 *
 * MongoDB-backed implementation of `MenuItemIdGenerator` using an atomic
 * find-and-update counter document to produce monotonic, unique identifiers.
 */
import type { Logger } from 'pino';
import type { MenuItemIdGenerator } from '../../application/ports/id-generator.js';
import { InvalidMenuItemIdError } from '../../domain/menu/menu-errors.js';
import { CounterModel } from './mongoose/counter-model.js';

/** Identifier of the single counter document that drives menu item ids. */
const COUNTER_ID = 'menu-item';

/**
 * Generates menu item identifiers from a MongoDB counter collection.
 */
export class MongoIdGenerator implements MenuItemIdGenerator {
  /**
   * @param logger - Optional logger; used to alert when the sequence would
   *   overflow `Number.MAX_SAFE_INTEGER`.
   */
  constructor(private readonly logger?: Logger) {}

  /**
   * Atomically increments and returns the next identifier.
   *
   * @returns The next positive safe-integer identifier.
   * @throws `InvalidMenuItemIdError` When the new sequence value is not a
   *   positive safe integer (overflow).
   */
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
