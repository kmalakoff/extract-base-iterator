import assert from 'assert';
import { allocBuffer, allocBufferUnsafe, bufferCompare, bufferConcat, bufferEquals, bufferFrom, bufferSliceCopy, canAllocateBufferSize, createInflateRawStream, destroyStream, inflateRaw, MAX_SAFE_BUFFER_LENGTH, readUInt64LE, tmpdir, writeUInt64LE } from 'extract-base-iterator';
import os from 'os';
import zlib from 'zlib';

const dep0005Warnings: Error[] = [];
function onWarning(warning: Error & { code?: string }) {
  if (warning && warning.code === 'DEP0005') dep0005Warnings.push(warning);
}
process.on('warning', onWarning);

describe('compat', () => {
  after(() => {
    process.removeListener('warning', onWarning);
  });
  describe('allocBuffer', () => {
    it('should allocate zero-filled buffer', () => {
      const buf = allocBuffer(10);
      assert.strictEqual(buf.length, 10);
      for (let i = 0; i < buf.length; i++) {
        assert.strictEqual(buf[i], 0);
      }
    });

    it('should handle size 0', () => {
      const buf = allocBuffer(0);
      assert.strictEqual(buf.length, 0);
    });
  });

  describe('allocBufferUnsafe', () => {
    it('should allocate buffer of correct size', () => {
      const buf = allocBufferUnsafe(10);
      assert.strictEqual(buf.length, 10);
    });

    it('should handle size 0', () => {
      const buf = allocBufferUnsafe(0);
      assert.strictEqual(buf.length, 0);
    });
  });

  describe('bufferFrom', () => {
    it('should create buffer from string', () => {
      const buf = bufferFrom('hello');
      assert.strictEqual(buf.toString(), 'hello');
    });

    it('should create buffer from string with encoding', () => {
      const buf = bufferFrom('68656c6c6f', 'hex');
      assert.strictEqual(buf.toString(), 'hello');
    });

    it('should create buffer from array', () => {
      const buf = bufferFrom([104, 101, 108, 108, 111]);
      assert.strictEqual(buf.toString(), 'hello');
    });

    it('should create buffer from existing buffer', () => {
      const original = allocBuffer(5);
      original[0] = 104;
      original[1] = 101;
      original[2] = 108;
      original[3] = 108;
      original[4] = 111;
      const buf = bufferFrom(original);
      assert.strictEqual(buf.toString(), 'hello');
    });
  });

  describe('bufferCompare', () => {
    it('should return 0 for equal buffers', () => {
      const a = bufferFrom('hello');
      const b = bufferFrom('hello');
      assert.strictEqual(bufferCompare(a, b), 0);
    });

    it('should return negative for lesser buffer', () => {
      const a = bufferFrom('apple');
      const b = bufferFrom('banana');
      assert.ok(bufferCompare(a, b) < 0);
    });

    it('should return positive for greater buffer', () => {
      const a = bufferFrom('banana');
      const b = bufferFrom('apple');
      assert.ok(bufferCompare(a, b) > 0);
    });

    it('should compare regions', () => {
      const a = bufferFrom('XXhelloXX');
      const b = bufferFrom('hello');
      assert.strictEqual(bufferCompare(a, b, 0, 5, 2, 7), 0);
    });
  });

  describe('bufferEquals', () => {
    it('should return true for matching bytes', () => {
      const buf = bufferFrom([0x50, 0x4b, 0x03, 0x04]);
      assert.strictEqual(bufferEquals(buf, 0, [0x50, 0x4b, 0x03, 0x04]), true);
    });

    it('should return false for non-matching bytes', () => {
      const buf = bufferFrom([0x50, 0x4b, 0x03, 0x04]);
      assert.strictEqual(bufferEquals(buf, 0, [0x50, 0x4b, 0x00, 0x00]), false);
    });

    it('should handle offset', () => {
      const buf = bufferFrom([0x00, 0x00, 0x50, 0x4b]);
      assert.strictEqual(bufferEquals(buf, 2, [0x50, 0x4b]), true);
    });

    it('should return false if expected extends past buffer', () => {
      const buf = bufferFrom([0x50, 0x4b]);
      assert.strictEqual(bufferEquals(buf, 0, [0x50, 0x4b, 0x03, 0x04]), false);
    });
  });

  describe('bufferSliceCopy', () => {
    it('should create independent copy', () => {
      const original = bufferFrom('hello world');
      const copy = bufferSliceCopy(original, 0, 5);
      assert.strictEqual(copy.toString(), 'hello');
      // Verify it's a copy, not a view
      copy[0] = 72; // 'H'
      assert.strictEqual(original.toString(), 'hello world');
    });

    it('should handle middle region', () => {
      const buf = bufferFrom('hello world');
      const copy = bufferSliceCopy(buf, 6, 11);
      assert.strictEqual(copy.toString(), 'world');
    });
  });

  describe('readUInt64LE / writeUInt64LE', () => {
    it('should read/write small values', () => {
      const buf = allocBuffer(8);
      writeUInt64LE(buf, 12345, 0);
      assert.strictEqual(readUInt64LE(buf, 0), 12345);
    });

    it('should read/write values up to 32-bit max', () => {
      const buf = allocBuffer(8);
      writeUInt64LE(buf, 0xffffffff, 0);
      assert.strictEqual(readUInt64LE(buf, 0), 0xffffffff);
    });

    it('should read/write values above 32-bit', () => {
      const buf = allocBuffer(8);
      const value = 0x100000000; // 2^32
      writeUInt64LE(buf, value, 0);
      assert.strictEqual(readUInt64LE(buf, 0), value);
    });

    it('should read/write large values within safe integer range', () => {
      const buf = allocBuffer(8);
      const value = 0x1fffffffffffff; // MAX_SAFE_INTEGER - close to it
      writeUInt64LE(buf, value, 0);
      // Due to floating point precision, we allow small differences
      const read = readUInt64LE(buf, 0);
      assert.ok(Math.abs(read - value) <= 1);
    });
  });

  describe('bufferConcat', () => {
    it('should concatenate buffers', () => {
      const a = bufferFrom('hello');
      const b = bufferFrom(' ');
      const c = bufferFrom('world');
      const result = bufferConcat([a, b, c]);
      assert.strictEqual(result.toString(), 'hello world');
    });

    it('should handle empty array', () => {
      const result = bufferConcat([]);
      assert.strictEqual(result.length, 0);
    });

    it('should handle single buffer', () => {
      const a = bufferFrom('hello');
      const result = bufferConcat([a]);
      assert.strictEqual(result.toString(), 'hello');
    });

    it('should respect totalLength parameter', () => {
      const a = bufferFrom('hello');
      const b = bufferFrom('world');
      const result = bufferConcat([a, b], 5);
      assert.strictEqual(result.length, 5);
      assert.strictEqual(result.toString(), 'hello');
    });
  });

  describe('isNaN', () => {
    it('should return true for NaN', () => {
      assert.strictEqual(Number.isNaN(NaN), true);
      assert.strictEqual(Number.isNaN(Number.NaN), true);
      assert.strictEqual(Number.isNaN(0 / 0), true);
    });

    it('should return false for numbers', () => {
      assert.strictEqual(Number.isNaN(0), false);
      assert.strictEqual(Number.isNaN(1), false);
      assert.strictEqual(Number.isNaN(-1), false);
      assert.strictEqual(Number.isNaN(Infinity), false);
      assert.strictEqual(Number.isNaN(-Infinity), false);
    });
  });

  describe('inflateRaw', () => {
    // Helper to create raw DEFLATE compressed data
    function deflateRaw(data: Buffer): Buffer {
      // Use native zlib if available, otherwise skip test
      if (typeof zlib.deflateRawSync !== 'function') {
        // For Node 0.8, we'd need pako to create test data
        // Skip by returning empty buffer which will cause test to be skipped
        return bufferFrom([]);
      }
      return zlib.deflateRawSync(data);
    }

    it('should decompress simple data', function () {
      const original = bufferFrom('hello world');
      const compressed = deflateRaw(original);
      if (compressed.length === 0) {
        this.skip();
        return;
      }

      const result = inflateRaw(compressed);
      assert.strictEqual(result.toString(), 'hello world');
    });

    it('should decompress larger data', function () {
      // Create 10KB of repeated text
      const text = 'The quick brown fox jumps over the lazy dog. ';
      let repeated = '';
      for (let i = 0; i < 200; i++) {
        repeated += text;
      }
      const original = bufferFrom(repeated);
      const compressed = deflateRaw(original);
      if (compressed.length === 0) {
        this.skip();
        return;
      }

      const result = inflateRaw(compressed);
      assert.strictEqual(result.length, original.length);
      assert.strictEqual(result.toString(), original.toString());
    });

    it('should handle empty data', function () {
      const original = bufferFrom('');
      const compressed = deflateRaw(original);
      if (compressed.length === 0) {
        this.skip();
        return;
      }

      const result = inflateRaw(compressed);
      assert.strictEqual(result.length, 0);
    });
  });

  describe('createInflateRawStream', () => {
    // Helper to create raw DEFLATE compressed data
    function deflateRaw(data: Buffer): Buffer {
      if (typeof zlib.deflateRawSync !== 'function') {
        return bufferFrom([]);
      }
      return zlib.deflateRawSync(data);
    }

    it('should decompress data via stream', function (done) {
      const original = bufferFrom('hello world streaming test');
      const compressed = deflateRaw(original);
      if (compressed.length === 0) {
        this.skip();
        return;
      }

      const inflate = createInflateRawStream();
      const chunks: Buffer[] = [];

      inflate.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      inflate.on('end', () => {
        const result = Buffer.concat(chunks);
        assert.strictEqual(result.toString(), original.toString());
        done();
      });

      inflate.on('error', done);

      inflate.write(compressed);
      inflate.end();
    });

    it('should handle chunked input', function (done) {
      const original = bufferFrom('This is a test of chunked streaming decompression.');
      const compressed = deflateRaw(original);
      if (compressed.length === 0) {
        this.skip();
        return;
      }

      const inflate = createInflateRawStream();
      const chunks: Buffer[] = [];

      inflate.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      inflate.on('end', () => {
        const result = Buffer.concat(chunks);
        assert.strictEqual(result.toString(), original.toString());
        done();
      });

      inflate.on('error', done);

      // Write compressed data in small chunks
      let offset = 0;
      const chunkSize = 5;
      while (offset < compressed.length) {
        const end = Math.min(offset + chunkSize, compressed.length);
        inflate.write(compressed.slice(offset, end));
        offset = end;
      }
      inflate.end();
    });

    it('should produce same output as sync inflateRaw', function (done) {
      // Create moderately sized data (50KB)
      const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
      let repeated = '';
      for (let i = 0; i < 1000; i++) {
        repeated += text;
      }
      const original = bufferFrom(repeated);
      const compressed = deflateRaw(original);
      if (compressed.length === 0) {
        this.skip();
        return;
      }

      // Get sync result for comparison
      const syncResult = inflateRaw(compressed);

      const inflate = createInflateRawStream();
      const chunks: Buffer[] = [];

      inflate.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      inflate.on('end', () => {
        const streamResult = Buffer.concat(chunks);
        assert.strictEqual(streamResult.length, syncResult.length);
        assert.strictEqual(streamResult.toString(), syncResult.toString());
        done();
      });

      inflate.on('error', done);

      // Write in realistic chunks (4KB at a time)
      let offset = 0;
      const chunkSize = 4096;
      while (offset < compressed.length) {
        const end = Math.min(offset + chunkSize, compressed.length);
        inflate.write(compressed.slice(offset, end));
        offset = end;
      }
      inflate.end();
    });

    it('should handle empty stream', function (done) {
      const original = bufferFrom('');
      const compressed = deflateRaw(original);
      if (compressed.length === 0) {
        this.skip();
        return;
      }

      const inflate = createInflateRawStream();
      const chunks: Buffer[] = [];

      inflate.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      inflate.on('end', () => {
        const result = Buffer.concat(chunks);
        assert.strictEqual(result.length, 0);
        done();
      });

      inflate.on('error', done);

      inflate.write(compressed);
      inflate.end();
    });
  });

  describe('empty buffers DEP0005', () => {
    it('should not emit DEP0005 for allocBuffer(0), allocBufferUnsafe(0), and bufferConcat([])', (done) => {
      const a = allocBuffer(0);
      const b = allocBufferUnsafe(0);
      const c = bufferConcat([]);
      assert.strictEqual(Buffer.isBuffer(a), true);
      assert.strictEqual(a.length, 0);
      assert.strictEqual(Buffer.isBuffer(b), true);
      assert.strictEqual(b.length, 0);
      assert.strictEqual(Buffer.isBuffer(c), true);
      assert.strictEqual(c.length, 0);
      process.nextTick(() => {
        try {
          assert.strictEqual(dep0005Warnings.length, 0);
          done();
        } catch (err) {
          done(err);
        }
      });
    });
  });

  describe('canAllocateBufferSize and large-buffer allocation', () => {
    it('should enforce MAX_SAFE_BUFFER_LENGTH bounds', () => {
      assert.strictEqual(canAllocateBufferSize(-1), false);
      assert.strictEqual(canAllocateBufferSize(0), true);
      assert.strictEqual(canAllocateBufferSize(MAX_SAFE_BUFFER_LENGTH), true);
      assert.strictEqual(canAllocateBufferSize(MAX_SAFE_BUFFER_LENGTH + 1), false);
    });

    it('should allocate buffers larger than MAX_SAFE_BUFFER_LENGTH via chunked path', () => {
      const size = MAX_SAFE_BUFFER_LENGTH + 1;
      const buf = allocBufferUnsafe(size);
      assert.strictEqual(Buffer.isBuffer(buf), true);
      assert.strictEqual(buf.length, size);
    });
  });

  describe('tmpdir', () => {
    it('should return a non-empty string path', () => {
      const dir = tmpdir();
      assert.strictEqual(typeof dir, 'string');
      assert.ok(dir.length > 0);
      if (typeof os.tmpdir === 'function') {
        assert.strictEqual(dir, os.tmpdir());
      }
    });
  });

  describe('destroyStream', () => {
    it('should call destroy() with no arguments when err is omitted', () => {
      let called = 0;
      let argCount = -1;
      const stream = {
        destroy(...args: unknown[]) {
          called++;
          argCount = args.length;
        },
      };
      destroyStream(stream);
      assert.strictEqual(called, 1);
      assert.strictEqual(argCount, 0);
    });

    it('should forward err when provided', () => {
      const received: (Error | null | undefined)[] = [];
      const stream = {
        destroy(err?: Error | null) {
          received.push(err);
        },
      };
      const error = new Error('boom');
      destroyStream(stream, error);
      destroyStream(stream, null);
      assert.strictEqual(received.length, 2);
      assert.strictEqual(received[0], error);
      assert.strictEqual(received[1], null);
    });

    it('should be a no-op for null, undefined, and objects without destroy', () => {
      destroyStream(null);
      destroyStream(undefined);
      destroyStream({});
      destroyStream({ destroy: 'not-a-function' });
    });
  });
});
