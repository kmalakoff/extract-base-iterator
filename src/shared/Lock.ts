/**
 * Lock - Reference counting for iterator lifecycle
 *
 * Ensures the iterator doesn't complete until all entries have been processed.
 * Uses cleanup registration pattern so each iterator can register its specific
 * cleanup functions (e.g., close file descriptors, delete temp files, end parsers).
 *
 * Usage:
 *   const lock = new Lock();
 *   lock.onDestroy = (err) => BaseIterator.prototype.end.call(this, err);
 *   lock.registerCleanup(() => { this.extract.end(); });
 *   lock.registerCleanup(() => { fs.unlinkSync(this.tempPath); });
 *
 *   // For each entry:
 *   lock.retain();
 *   // ... when entry is consumed:
 *   lock.release();
 *
 *   // When iteration complete:
 *   lock.err = err; // optional error
 *   lock.release(); // Initial count
 */

export type CleanupFn = () => void;

export default class Lock {
  private count = 1;
  private cleanupFns: CleanupFn[] = [];

  /** Error to pass to onDestroy callback */
  err: Error | null = null;

  /** Called after all cleanups when count reaches 0 */
  onDestroy: ((err: Error | null) => void) | null = null;

  /**
   * Register a cleanup function to be called when the lock is destroyed.
   * Cleanup functions are called in registration order, before onDestroy.
   * @param fn Cleanup function (should not throw)
   */
  registerCleanup(fn: CleanupFn): void {
    this.cleanupFns.push(fn);
  }

  /**
   * Increment reference count.
   * Call when starting to process a new entry.
   */
  retain(): void {
    this.count++;
  }

  /**
   * Decrement reference count.
   * Call when an entry has been fully consumed.
   * When count reaches 0, cleanup is triggered.
   */
  release(): void {
    if (this.count <= 0) {
      throw new Error('Lock count is corrupted');
    }
    this.count--;
    if (this.count === 0) {
      this._destroy();
    }
  }

  /**
   * Internal cleanup - called when reference count reaches 0
   */
  private _destroy(): void {
    // Run all registered cleanup functions in order
    // Note: Use traditional for loop for Node 0.8 compatibility (no Symbol.iterator)
    const fns = this.cleanupFns;
    for (let i = 0; i < fns.length; i++) {
      try {
        fns[i]();
      } catch (_e) {
        // Ignore cleanup errors to ensure all cleanup runs
      }
    }
    this.cleanupFns = [];

    // Call onDestroy callback LAST (typically calls iterator.end())
    if (this.onDestroy) {
      this.onDestroy(this.err);
      this.onDestroy = null;
    }
  }
}
