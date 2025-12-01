/**
 * EntryStream - Simple readable stream for entry content
 *
 * Extends Readable to emit 'data', 'end', 'error' events.
 * Node 0.8 compatible via readable-stream polyfill.
 *
 * This base class is designed to be used by:
 * - zip-iterator
 * - 7z-iterator
 * - tar-iterator
 * - Any other archive iterator library
 */

import StreamCompat from 'readable-stream';
import Stream from 'stream';

// Use native streams when available, readable-stream only for Node 0.x
const major = +process.versions.node.split('.')[0];
const ReadableBase: typeof Stream.Readable = major > 0 ? Stream.Readable : (StreamCompat.Readable as typeof Stream.Readable);

/**
 * Base stream class for archive entry content.
 * Can be extended for special entry types like sparse files.
 */
export default class EntryStream extends ReadableBase {
  protected _ended = false;

  constructor() {
    // Use a large highWaterMark since data is pushed externally (not from _read)
    // This prevents backpressure issues when pushing synchronously
    super({ highWaterMark: 1024 * 1024 }); // 1MB buffer
  }

  /**
   * Signal end of stream by pushing null
   */
  end(): void {
    if (this._ended) return;
    this._ended = true;
    this.push(null);
  }

  /**
   * Check if stream has ended
   */
  get ended(): boolean {
    return this._ended;
  }

  /**
   * Required by Readable - called when consumer wants data.
   * Data is pushed externally via push(), nothing to do here.
   */
  _read(_size: number): void {
    // Data is pushed externally, nothing to do here
  }
}
