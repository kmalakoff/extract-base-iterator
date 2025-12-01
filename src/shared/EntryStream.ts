/**
 * EntryStream - Simple readable-like stream for entry content
 *
 * Extends EventEmitter to emit 'data', 'end', 'error' events.
 * Node 0.8 compatible.
 *
 * This base class is designed to be used by:
 * - zip-iterator
 * - 7z-iterator
 * - tar-iterator
 * - Any other archive iterator library
 */

import { EventEmitter } from 'events';

/**
 * Base stream class for archive entry content.
 * Can be extended for special entry types like sparse files.
 */
export default class EntryStream extends EventEmitter {
  protected _paused = true;
  protected _ended = false;
  protected _endEmitted = false;
  protected _buffered: Buffer[] = [];

  /**
   * Push data to the stream
   */
  push(data: Buffer): void {
    if (this._ended) return;

    if (this._paused) {
      this._buffered.push(data);
    } else {
      this.emit('data', data);
    }
  }

  /**
   * End the stream
   */
  end(): void {
    if (this._ended) return;
    this._ended = true;

    // If not paused, flush and emit end now
    if (!this._paused) {
      this._flush();
      this._emitEnd();
    }
    // Otherwise, end will be emitted when resume() is called
  }

  /**
   * Resume reading (drain buffered data)
   */
  resume(): this {
    if (!this._paused) return this;
    this._paused = false;
    this._flush();
    // If stream was ended while paused, emit end now
    if (this._ended && !this._endEmitted) {
      this._emitEnd();
    }
    return this;
  }

  /**
   * Pause reading
   */
  pause(): this {
    this._paused = true;
    return this;
  }

  /**
   * Check if stream has ended
   */
  get ended(): boolean {
    return this._ended;
  }

  /**
   * Pipe to a writable stream
   */
  pipe<T extends NodeJS.WritableStream>(dest: T): T {
    var self = this;
    // Cast to EventEmitter-compatible type for backpressure handling
    var emitter = dest as T & { once?: (event: string, fn: () => void) => void };
    this.on('data', function onData(chunk: Buffer) {
      var canContinue = dest.write(chunk);
      // Handle backpressure if dest returns false
      if (canContinue === false && typeof emitter.once === 'function') {
        self.pause();
        emitter.once('drain', function onDrain() {
          self.resume();
        });
      }
    });

    this.on('end', function onEnd() {
      if (typeof dest.end === 'function') {
        dest.end();
      }
    });

    this.resume();
    return dest;
  }

  /**
   * Flush buffered data
   */
  protected _flush(): void {
    while (this._buffered.length > 0) {
      var chunk = this._buffered.shift();
      this.emit('data', chunk);
    }
  }

  /**
   * Emit end event (only once)
   */
  protected _emitEnd(): void {
    if (this._endEmitted) return;
    this._endEmitted = true;
    this.emit('end');
  }
}
