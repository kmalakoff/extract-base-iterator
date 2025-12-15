import ExtractBaseIterator, { type Entry, type ExtractOptions } from 'extract-base-iterator';

export default class EntryIterator extends ExtractBaseIterator<Entry> {
  entries: Entry[];

  constructor(entries: Entry[], options: ExtractOptions = {}) {
    super(options);
    this.entries = entries.slice();

    const next = (iterator, callback) => {
      if (iterator.done || !this.entries.length) return callback();

      // keep going
      iterator.push(next);
      callback(null, { done: false, value: this.entries.shift() });
    };
    super.push(next);
  }
}
