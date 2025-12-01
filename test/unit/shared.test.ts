import assert from 'assert';
// biome-ignore lint/suspicious/noShadowRestrictedNames: Legacy compatibility
import { allocBuffer, allocBufferUnsafe, bufferCompare, bufferConcat, bufferEquals, bufferFrom, bufferSliceCopy, crc32, crc32Region, EntryStream, isNaN, readUInt64LE, verifyCrc32, verifyCrc32Region, writeUInt64LE } from 'extract-base-iterator';

describe('shared utilities', () => {
  describe('compat', () => {
    describe('allocBuffer', () => {
      it('should allocate zero-filled buffer', () => {
        var buf = allocBuffer(10);
        assert.strictEqual(buf.length, 10);
        for (var i = 0; i < buf.length; i++) {
          assert.strictEqual(buf[i], 0);
        }
      });

      it('should handle size 0', () => {
        var buf = allocBuffer(0);
        assert.strictEqual(buf.length, 0);
      });
    });

    describe('allocBufferUnsafe', () => {
      it('should allocate buffer of correct size', () => {
        var buf = allocBufferUnsafe(10);
        assert.strictEqual(buf.length, 10);
      });

      it('should handle size 0', () => {
        var buf = allocBufferUnsafe(0);
        assert.strictEqual(buf.length, 0);
      });
    });

    describe('bufferFrom', () => {
      it('should create buffer from string', () => {
        var buf = bufferFrom('hello');
        assert.strictEqual(buf.toString(), 'hello');
      });

      it('should create buffer from string with encoding', () => {
        var buf = bufferFrom('68656c6c6f', 'hex');
        assert.strictEqual(buf.toString(), 'hello');
      });

      it('should create buffer from array', () => {
        var buf = bufferFrom([104, 101, 108, 108, 111]);
        assert.strictEqual(buf.toString(), 'hello');
      });

      it('should create buffer from existing buffer', () => {
        var original = allocBuffer(5);
        original[0] = 104;
        original[1] = 101;
        original[2] = 108;
        original[3] = 108;
        original[4] = 111;
        var buf = bufferFrom(original);
        assert.strictEqual(buf.toString(), 'hello');
      });
    });

    describe('bufferCompare', () => {
      it('should return 0 for equal buffers', () => {
        var a = bufferFrom('hello');
        var b = bufferFrom('hello');
        assert.strictEqual(bufferCompare(a, b), 0);
      });

      it('should return negative for lesser buffer', () => {
        var a = bufferFrom('apple');
        var b = bufferFrom('banana');
        assert.ok(bufferCompare(a, b) < 0);
      });

      it('should return positive for greater buffer', () => {
        var a = bufferFrom('banana');
        var b = bufferFrom('apple');
        assert.ok(bufferCompare(a, b) > 0);
      });

      it('should compare regions', () => {
        var a = bufferFrom('XXhelloXX');
        var b = bufferFrom('hello');
        assert.strictEqual(bufferCompare(a, b, 0, 5, 2, 7), 0);
      });
    });

    describe('bufferEquals', () => {
      it('should return true for matching bytes', () => {
        var buf = bufferFrom([0x50, 0x4b, 0x03, 0x04]);
        assert.strictEqual(bufferEquals(buf, 0, [0x50, 0x4b, 0x03, 0x04]), true);
      });

      it('should return false for non-matching bytes', () => {
        var buf = bufferFrom([0x50, 0x4b, 0x03, 0x04]);
        assert.strictEqual(bufferEquals(buf, 0, [0x50, 0x4b, 0x00, 0x00]), false);
      });

      it('should handle offset', () => {
        var buf = bufferFrom([0x00, 0x00, 0x50, 0x4b]);
        assert.strictEqual(bufferEquals(buf, 2, [0x50, 0x4b]), true);
      });

      it('should return false if expected extends past buffer', () => {
        var buf = bufferFrom([0x50, 0x4b]);
        assert.strictEqual(bufferEquals(buf, 0, [0x50, 0x4b, 0x03, 0x04]), false);
      });
    });

    describe('bufferSliceCopy', () => {
      it('should create independent copy', () => {
        var original = bufferFrom('hello world');
        var copy = bufferSliceCopy(original, 0, 5);
        assert.strictEqual(copy.toString(), 'hello');
        // Verify it's a copy, not a view
        copy[0] = 72; // 'H'
        assert.strictEqual(original.toString(), 'hello world');
      });

      it('should handle middle region', () => {
        var buf = bufferFrom('hello world');
        var copy = bufferSliceCopy(buf, 6, 11);
        assert.strictEqual(copy.toString(), 'world');
      });
    });

    describe('readUInt64LE / writeUInt64LE', () => {
      it('should read/write small values', () => {
        var buf = allocBuffer(8);
        writeUInt64LE(buf, 12345, 0);
        assert.strictEqual(readUInt64LE(buf, 0), 12345);
      });

      it('should read/write values up to 32-bit max', () => {
        var buf = allocBuffer(8);
        writeUInt64LE(buf, 0xffffffff, 0);
        assert.strictEqual(readUInt64LE(buf, 0), 0xffffffff);
      });

      it('should read/write values above 32-bit', () => {
        var buf = allocBuffer(8);
        var value = 0x100000000; // 2^32
        writeUInt64LE(buf, value, 0);
        assert.strictEqual(readUInt64LE(buf, 0), value);
      });

      it('should read/write large values within safe integer range', () => {
        var buf = allocBuffer(8);
        var value = 0x1fffffffffffff; // MAX_SAFE_INTEGER - close to it
        writeUInt64LE(buf, value, 0);
        // Due to floating point precision, we allow small differences
        var read = readUInt64LE(buf, 0);
        assert.ok(Math.abs(read - value) <= 1);
      });
    });

    describe('bufferConcat', () => {
      it('should concatenate buffers', () => {
        var a = bufferFrom('hello');
        var b = bufferFrom(' ');
        var c = bufferFrom('world');
        var result = bufferConcat([a, b, c]);
        assert.strictEqual(result.toString(), 'hello world');
      });

      it('should handle empty array', () => {
        var result = bufferConcat([]);
        assert.strictEqual(result.length, 0);
      });

      it('should handle single buffer', () => {
        var a = bufferFrom('hello');
        var result = bufferConcat([a]);
        assert.strictEqual(result.toString(), 'hello');
      });

      it('should respect totalLength parameter', () => {
        var a = bufferFrom('hello');
        var b = bufferFrom('world');
        var result = bufferConcat([a, b], 5);
        assert.strictEqual(result.length, 5);
        assert.strictEqual(result.toString(), 'hello');
      });
    });

    describe('isNaN', () => {
      it('should return true for NaN', () => {
        assert.strictEqual(isNaN(NaN), true);
        assert.strictEqual(isNaN(Number.NaN), true);
        assert.strictEqual(isNaN(0 / 0), true);
      });

      it('should return false for numbers', () => {
        assert.strictEqual(isNaN(0), false);
        assert.strictEqual(isNaN(1), false);
        assert.strictEqual(isNaN(-1), false);
        assert.strictEqual(isNaN(Infinity), false);
        assert.strictEqual(isNaN(-Infinity), false);
      });
    });
  });

  describe('crc32', () => {
    describe('crc32', () => {
      it('should calculate correct CRC32 for empty buffer', () => {
        var buf = allocBuffer(0);
        assert.strictEqual(crc32(buf), 0);
      });

      it('should calculate correct CRC32 for known values', () => {
        // "123456789" has well-known CRC32 value
        var buf = bufferFrom('123456789');
        assert.strictEqual(crc32(buf), 0xcbf43926);
      });

      it('should calculate correct CRC32 for simple string', () => {
        var buf = bufferFrom('hello');
        // Known CRC32 for "hello"
        assert.strictEqual(crc32(buf), 0x3610a686);
      });

      it('should support streaming calculation', () => {
        var part1 = bufferFrom('hello');
        var part2 = bufferFrom(' world');
        var full = bufferFrom('hello world');

        var crc1 = crc32(part1);
        var crc2 = crc32(part2, crc1);

        assert.strictEqual(crc2, crc32(full));
      });
    });

    describe('crc32Region', () => {
      it('should calculate CRC32 of buffer region', () => {
        var buf = bufferFrom('XXhelloXX');
        var expected = crc32(bufferFrom('hello'));
        assert.strictEqual(crc32Region(buf, 2, 5), expected);
      });
    });

    describe('verifyCrc32', () => {
      it('should return true for correct CRC', () => {
        var buf = bufferFrom('123456789');
        assert.strictEqual(verifyCrc32(buf, 0xcbf43926), true);
      });

      it('should return false for incorrect CRC', () => {
        var buf = bufferFrom('123456789');
        assert.strictEqual(verifyCrc32(buf, 0x12345678), false);
      });
    });

    describe('verifyCrc32Region', () => {
      it('should verify CRC32 of buffer region', () => {
        var buf = bufferFrom('XXhelloXX');
        assert.strictEqual(verifyCrc32Region(buf, 2, 5, 0x3610a686), true);
        assert.strictEqual(verifyCrc32Region(buf, 2, 5, 0x12345678), false);
      });
    });
  });

  describe('EntryStream', () => {
    it('should emit data when resumed', (done) => {
      var stream = new EntryStream();
      var chunks: Buffer[] = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        assert.strictEqual(chunks.length, 2);
        assert.strictEqual(chunks[0].toString(), 'hello');
        assert.strictEqual(chunks[1].toString(), 'world');
        done();
      });

      stream.push(bufferFrom('hello'));
      stream.push(bufferFrom('world'));
      stream.end();
      stream.resume();
    });

    it('should buffer data when paused', (done) => {
      var stream = new EntryStream();
      var chunks: Buffer[] = [];

      stream.push(bufferFrom('hello'));
      stream.push(bufferFrom('world'));

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        assert.strictEqual(chunks.length, 2);
        done();
      });

      // Data should be buffered until resume
      assert.strictEqual(chunks.length, 0);

      stream.end();
      stream.resume();
    });

    it('should emit end after flush when stream ended while paused', (done) => {
      var stream = new EntryStream();
      var dataReceived = false;

      stream.push(bufferFrom('data'));
      stream.end();

      stream.on('data', () => {
        dataReceived = true;
      });

      stream.on('end', () => {
        assert.strictEqual(dataReceived, true);
        done();
      });

      stream.resume();
    });

    it('should handle pause and resume', (done) => {
      var stream = new EntryStream();
      var chunks: Buffer[] = [];

      stream.on('data', (chunk) => {
        chunks.push(chunk);
        stream.pause();
        // Resume after a tick
        setTimeout(() => {
          stream.resume();
        }, 0);
      });

      stream.on('end', () => {
        assert.strictEqual(chunks.length, 2);
        done();
      });

      stream.push(bufferFrom('one'));
      stream.push(bufferFrom('two'));
      stream.end();
      stream.resume();
    });

    it('should report ended state', () => {
      var stream = new EntryStream();
      assert.strictEqual(stream.ended, false);
      stream.end();
      assert.strictEqual(stream.ended, true);
    });

    it('should receive errors via emit', (done) => {
      var stream = new EntryStream();
      var testError = new Error('test error');

      stream.on('error', (err) => {
        assert.strictEqual(err, testError);
        done();
      });

      stream.emit('error', testError);
    });
  });
});
