import assert from 'assert';
import Lock from '../../src/shared/Lock.ts';

describe('Lock', () => {
  describe('reference counting', () => {
    it('starts with count of 1', () => {
      const lock = new Lock();
      // Can release once (count goes 1 -> 0)
      lock.release();
      // Second release should throw
      assert.throws(() => lock.release(), /Lock count is corrupted/);
    });

    it('retain increments count', () => {
      const lock = new Lock();
      lock.retain(); // 1 -> 2
      lock.retain(); // 2 -> 3
      lock.release(); // 3 -> 2
      lock.release(); // 2 -> 1
      lock.release(); // 1 -> 0
      assert.throws(() => lock.release(), /Lock count is corrupted/);
    });

    it('throws on release when count is zero', () => {
      const lock = new Lock();
      lock.release(); // 1 -> 0
      assert.throws(() => lock.release(), /Lock count is corrupted/);
    });
  });

  describe('cleanup functions', () => {
    it('runs cleanup functions when count reaches 0', () => {
      const lock = new Lock();
      const calls: string[] = [];
      lock.registerCleanup(() => calls.push('a'));
      lock.registerCleanup(() => calls.push('b'));

      assert.deepStrictEqual(calls, []);
      lock.release();
      assert.deepStrictEqual(calls, ['a', 'b']);
    });

    it('runs cleanup functions in registration order', () => {
      const lock = new Lock();
      const calls: number[] = [];
      lock.registerCleanup(() => calls.push(1));
      lock.registerCleanup(() => calls.push(2));
      lock.registerCleanup(() => calls.push(3));

      lock.release();
      assert.deepStrictEqual(calls, [1, 2, 3]);
    });

    it('continues running cleanups even if one throws', () => {
      const lock = new Lock();
      const calls: string[] = [];
      lock.registerCleanup(() => calls.push('first'));
      lock.registerCleanup(() => {
        throw new Error('cleanup error');
      });
      lock.registerCleanup(() => calls.push('third'));

      lock.release();
      assert.deepStrictEqual(calls, ['first', 'third']);
    });

    it('clears cleanup functions after running', () => {
      const lock = new Lock();
      let callCount = 0;
      lock.registerCleanup(() => callCount++);

      // First release triggers cleanup
      lock.retain(); // so we can release twice
      lock.release();
      assert.strictEqual(callCount, 0); // not at zero yet

      lock.release(); // now at zero
      assert.strictEqual(callCount, 1);
    });
  });

  describe('onDestroy callback', () => {
    it('calls onDestroy when count reaches 0', () => {
      const lock = new Lock();
      let destroyCalled = false;
      let destroyError: Error | null = null;

      lock.onDestroy = (err) => {
        destroyCalled = true;
        destroyError = err;
      };
      lock.release();

      assert.strictEqual(destroyCalled, true);
      assert.strictEqual(destroyError, null);
    });

    it('passes error to onDestroy', () => {
      const lock = new Lock();
      let destroyError: Error | null = null;

      lock.onDestroy = (err) => {
        destroyError = err;
      };
      lock.err = new Error('test error');
      lock.release();

      assert.strictEqual(destroyError?.message, 'test error');
    });

    it('calls cleanups before onDestroy', () => {
      const lock = new Lock();
      const calls: string[] = [];

      lock.onDestroy = () => calls.push('destroy');
      lock.registerCleanup(() => calls.push('cleanup1'));
      lock.registerCleanup(() => calls.push('cleanup2'));

      lock.release();
      assert.deepStrictEqual(calls, ['cleanup1', 'cleanup2', 'destroy']);
    });

    it('clears onDestroy after calling', () => {
      const lock = new Lock();
      lock.onDestroy = () => {};
      lock.release();
      assert.strictEqual(lock.onDestroy, null);
    });

    it('works without onDestroy set', () => {
      const lock = new Lock();
      const calls: string[] = [];
      lock.registerCleanup(() => calls.push('cleanup'));

      // Should not throw when onDestroy is null
      lock.release();
      assert.deepStrictEqual(calls, ['cleanup']);
    });
  });

  describe('typical usage pattern', () => {
    it('simulates iterator with multiple entries', () => {
      const lock = new Lock();
      const cleanedUp: string[] = [];

      lock.registerCleanup(() => cleanedUp.push('stream'));
      lock.registerCleanup(() => cleanedUp.push('tempfile'));

      // Three entries are created
      lock.retain(); // entry 1
      lock.retain(); // entry 2
      lock.retain(); // entry 3

      // Iterator finishes streaming
      lock.release(); // initial count

      // Cleanup shouldn't happen yet
      assert.deepStrictEqual(cleanedUp, []);

      // Entries are consumed one by one
      lock.release(); // entry 1 done
      assert.deepStrictEqual(cleanedUp, []);

      lock.release(); // entry 2 done
      assert.deepStrictEqual(cleanedUp, []);

      lock.release(); // entry 3 done - now cleanup happens
      assert.deepStrictEqual(cleanedUp, ['stream', 'tempfile']);
    });

    it('handles early termination (destroy)', () => {
      const lock = new Lock();
      const cleanedUp: string[] = [];
      let destroyCalled = false;
      let destroyError: Error | null = null;

      lock.onDestroy = (err) => {
        destroyCalled = true;
        destroyError = err;
      };
      lock.registerCleanup(() => cleanedUp.push('resource'));

      // Entries created
      lock.retain();
      lock.retain();

      // Early termination with error
      lock.err = new Error('destroyed');

      // Release all at once (simulating destroy)
      lock.release();
      lock.release();
      lock.release();

      assert.deepStrictEqual(cleanedUp, ['resource']);
      assert.strictEqual(destroyCalled, true);
      assert.strictEqual(destroyError?.message, 'destroyed');
    });
  });
});
