import ExtractBaseIterator, { type Entry, type ExtractOptions } from 'extract-base-iterator';
import type { StackFunction } from 'stack-base-iterator';

export default class EntryIterator extends ExtractBaseIterator<Entry> {
  entries: Entry[];

  constructor(entries: Entry[], options: ExtractOptions = {}) {
    super(options);
    this.entries = entries.slice();

    const next: StackFunction<Entry> = (iterator, callback) => {
      if ((iterator as EntryIterator).done || !this.entries.length) return callback();

      // keep going
      iterator.push(next);
      const entry = this.entries.shift() as Entry;
      callback(undefined, { done: false, value: entry });
    };
    super.push(next);
  }
}
