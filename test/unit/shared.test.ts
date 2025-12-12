import assert from 'assert';
// biome-ignore lint/suspicious/noShadowRestrictedNames: Legacy compatibility
import { allocBuffer, allocBufferUnsafe, BufferList, bufferCompare, bufferConcat, bufferEquals, bufferFrom, bufferSliceCopy, crc32, crc32Region, createInflateRawStream, EntryStream, inflateRaw, isNaN, readUInt64LE, verifyCrc32, verifyCrc32Region, writeUInt64LE } from 'extract-base-iterator';
import zlib from 'zlib';

describe('shared utilities', () => {
  describe('compat', () => {
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
  });

  describe('crc32', () => {
    describe('crc32', () => {
      it('should calculate correct CRC32 for empty buffer', () => {
        const buf = allocBuffer(0);
        assert.strictEqual(crc32(buf), 0);
      });

      it('should calculate correct CRC32 for known values', () => {
        // "123456789" has well-known CRC32 value
        const buf = bufferFrom('123456789');
        assert.strictEqual(crc32(buf), 0xcbf43926);
      });

      it('should calculate correct CRC32 for simple string', () => {
        const buf = bufferFrom('hello');
        // Known CRC32 for "hello"
        assert.strictEqual(crc32(buf), 0x3610a686);
      });

      it('should support streaming calculation', () => {
        const part1 = bufferFrom('hello');
        const part2 = bufferFrom(' world');
        const full = bufferFrom('hello world');

        const crc1 = crc32(part1);
        const crc2 = crc32(part2, crc1);

        assert.strictEqual(crc2, crc32(full));
      });
    });

    describe('crc32Region', () => {
      it('should calculate CRC32 of buffer region', () => {
        const buf = bufferFrom('XXhelloXX');
        const expected = crc32(bufferFrom('hello'));
        assert.strictEqual(crc32Region(buf, 2, 5), expected);
      });
    });

    describe('verifyCrc32', () => {
      it('should return true for correct CRC', () => {
        const buf = bufferFrom('123456789');
        assert.strictEqual(verifyCrc32(buf, 0xcbf43926), true);
      });

      it('should return false for incorrect CRC', () => {
        const buf = bufferFrom('123456789');
        assert.strictEqual(verifyCrc32(buf, 0x12345678), false);
      });
    });

    describe('verifyCrc32Region', () => {
      it('should verify CRC32 of buffer region', () => {
        const buf = bufferFrom('XXhelloXX');
        assert.strictEqual(verifyCrc32Region(buf, 2, 5, 0x3610a686), true);
        assert.strictEqual(verifyCrc32Region(buf, 2, 5, 0x12345678), false);
      });
    });
  });

  describe('EntryStream', () => {
    it('should emit data when resumed', (done) => {
      const stream = new EntryStream();
      const chunks: Buffer[] = [];

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
      const stream = new EntryStream();
      const chunks: Buffer[] = [];

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
      const stream = new EntryStream();
      let dataReceived = false;

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
      const stream = new EntryStream();
      const chunks: Buffer[] = [];

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
      const stream = new EntryStream();
      assert.strictEqual(stream.ended, false);
      stream.end();
      assert.strictEqual(stream.ended, true);
    });

    it('should receive errors via emit', (done) => {
      const stream = new EntryStream();
      const testError = new Error('test error');

      stream.on('error', (err) => {
        assert.strictEqual(err, testError);
        done();
      });

      stream.emit('error', testError);
    });
  });

  describe('BufferList', () => {
    describe('append and length', () => {
      it('should start empty', () => {
        const list = new BufferList();
        assert.strictEqual(list.length, 0);
      });

      it('should track length after append', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));
        assert.strictEqual(list.length, 5);
        list.append(bufferFrom(' world'));
        assert.strictEqual(list.length, 11);
      });

      it('should ignore empty buffers', () => {
        const list = new BufferList();
        list.append(bufferFrom(''));
        assert.strictEqual(list.length, 0);
      });
    });

    describe('consume', () => {
      it('should consume bytes from front', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));
        list.append(bufferFrom(' world'));

        const result = list.consume(5);
        assert.strictEqual(result.toString(), 'hello');
        assert.strictEqual(list.length, 6);
      });

      it('should consume across chunk boundaries', () => {
        const list = new BufferList();
        list.append(bufferFrom('hel'));
        list.append(bufferFrom('lo'));

        const result = list.consume(5);
        assert.strictEqual(result.toString(), 'hello');
        assert.strictEqual(list.length, 0);
      });

      it('should handle consuming zero bytes', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));

        const result = list.consume(0);
        assert.strictEqual(result.length, 0);
        assert.strictEqual(list.length, 5);
      });

      it('should consume partial chunk', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello world'));

        const result = list.consume(5);
        assert.strictEqual(result.toString(), 'hello');
        assert.strictEqual(list.length, 6);

        const result2 = list.consume(6);
        assert.strictEqual(result2.toString(), ' world');
        assert.strictEqual(list.length, 0);
      });
    });

    describe('has', () => {
      it('should return true when enough bytes available', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));

        assert.strictEqual(list.has(5), true);
        assert.strictEqual(list.has(3), true);
        assert.strictEqual(list.has(0), true);
      });

      it('should return false when not enough bytes', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));

        assert.strictEqual(list.has(6), false);
        assert.strictEqual(list.has(100), false);
      });
    });

    describe('clear', () => {
      it('should clear all data', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));
        list.append(bufferFrom(' world'));

        list.clear();
        assert.strictEqual(list.length, 0);
      });
    });

    describe('prepend', () => {
      it('should add data to front', () => {
        const list = new BufferList();
        list.append(bufferFrom(' world'));
        list.prepend(bufferFrom('hello'));

        const result = list.consume(11);
        assert.strictEqual(result.toString(), 'hello world');
      });

      it('should ignore empty buffers', () => {
        const list = new BufferList();
        list.prepend(bufferFrom(''));
        assert.strictEqual(list.length, 0);
      });
    });

    describe('slice', () => {
      it('should return copy of region without consuming', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello world'));

        const slice = list.slice(0, 5);
        assert.strictEqual(slice.toString(), 'hello');
        assert.strictEqual(list.length, 11); // unchanged
      });

      it('should slice across chunk boundaries', () => {
        const list = new BufferList();
        list.append(bufferFrom('hel'));
        list.append(bufferFrom('lo '));
        list.append(bufferFrom('wor'));
        list.append(bufferFrom('ld'));

        const slice = list.slice(3, 8);
        assert.strictEqual(slice.toString(), 'lo wo');
      });

      it('should handle empty slice', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));

        const slice = list.slice(0, 0);
        assert.strictEqual(slice.length, 0);
      });
    });

    describe('readByte', () => {
      it('should read byte at offset', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));

        assert.strictEqual(list.readByte(0), 104); // 'h'
        assert.strictEqual(list.readByte(4), 111); // 'o'
      });

      it('should read across chunks', () => {
        const list = new BufferList();
        list.append(bufferFrom('hel'));
        list.append(bufferFrom('lo'));

        assert.strictEqual(list.readByte(3), 108); // 'l' in second chunk
        assert.strictEqual(list.readByte(4), 111); // 'o'
      });

      it('should return -1 for out of bounds', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));

        assert.strictEqual(list.readByte(-1), -1);
        assert.strictEqual(list.readByte(5), -1);
        assert.strictEqual(list.readByte(100), -1);
      });
    });

    describe('indexOf', () => {
      it('should find signature at start', () => {
        const list = new BufferList();
        list.append(bufferFrom([0x50, 0x4b, 0x03, 0x04])); // ZIP signature

        assert.strictEqual(list.indexOf([0x50, 0x4b]), 0);
      });

      it('should find signature in middle', () => {
        const list = new BufferList();
        list.append(bufferFrom([0x00, 0x00, 0x50, 0x4b, 0x03, 0x04]));

        assert.strictEqual(list.indexOf([0x50, 0x4b]), 2);
      });

      it('should return -1 when not found', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));

        assert.strictEqual(list.indexOf([0x50, 0x4b]), -1);
      });

      it('should search from startOffset', () => {
        const list = new BufferList();
        list.append(bufferFrom([0x50, 0x4b, 0x00, 0x50, 0x4b]));

        assert.strictEqual(list.indexOf([0x50, 0x4b], 1), 3);
      });
    });

    describe('skip', () => {
      it('should skip bytes without returning them', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello world'));

        list.skip(6);
        assert.strictEqual(list.length, 5);

        const result = list.consume(5);
        assert.strictEqual(result.toString(), 'world');
      });

      it('should handle skip of zero', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));

        list.skip(0);
        assert.strictEqual(list.length, 5);
      });

      it('should handle skip larger than length', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));

        list.skip(100);
        assert.strictEqual(list.length, 0);
      });
    });

    describe('startsWith', () => {
      it('should return true for matching prefix', () => {
        const list = new BufferList();
        list.append(bufferFrom([0x50, 0x4b, 0x03, 0x04]));

        assert.strictEqual(list.startsWith([0x50, 0x4b]), true);
        assert.strictEqual(list.startsWith([0x50, 0x4b, 0x03, 0x04]), true);
      });

      it('should return false for non-matching prefix', () => {
        const list = new BufferList();
        list.append(bufferFrom([0x50, 0x4b, 0x03, 0x04]));

        assert.strictEqual(list.startsWith([0x00, 0x00]), false);
      });

      it('should return false if signature longer than buffer', () => {
        const list = new BufferList();
        list.append(bufferFrom([0x50, 0x4b]));

        assert.strictEqual(list.startsWith([0x50, 0x4b, 0x03, 0x04]), false);
      });
    });

    describe('toBuffer', () => {
      it('should return consolidated buffer', () => {
        const list = new BufferList();
        list.append(bufferFrom('hello'));
        list.append(bufferFrom(' '));
        list.append(bufferFrom('world'));

        const result = list.toBuffer();
        assert.strictEqual(result.toString(), 'hello world');
        assert.strictEqual(list.length, 11); // unchanged
      });

      it('should return empty buffer for empty list', () => {
        const list = new BufferList();
        const result = list.toBuffer();
        assert.strictEqual(result.length, 0);
      });
    });
  });
});
