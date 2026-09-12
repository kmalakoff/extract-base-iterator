import assert from 'assert';
import { BufferList, bufferFrom } from 'extract-base-iterator';

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

  describe('readUInt16LEAt', () => {
    it('should read UInt16 at offset', () => {
      const list = new BufferList();
      const buf = bufferFrom([0x34, 0x12, 0x56, 0x78]);
      list.append(buf);

      assert.strictEqual(list.readUInt16LEAt(0), 0x1234);
      assert.strictEqual(list.readUInt16LEAt(2), 0x7856);
    });

    it('should read across chunk boundaries', () => {
      const list = new BufferList();
      list.append(bufferFrom([0x34, 0x12]));
      list.append(bufferFrom([0x56, 0x78]));

      // Should be able to read 0x1234 at offset 0
      assert.strictEqual(list.readUInt16LEAt(0), 0x1234);
      // And 0x7856 at offset 2 (split across chunks)
      assert.strictEqual(list.readUInt16LEAt(2), 0x7856);
    });

    it('should return null for out of bounds', () => {
      const list = new BufferList();
      list.append(bufferFrom([0x34, 0x12]));

      assert.strictEqual(list.readUInt16LEAt(-1), null);
      assert.strictEqual(list.readUInt16LEAt(1), null);
      assert.strictEqual(list.readUInt16LEAt(2), null);
    });

    it('should handle empty list', () => {
      const list = new BufferList();
      assert.strictEqual(list.readUInt16LEAt(0), null);
    });
  });

  describe('readUInt32LEAt', () => {
    it('should read UInt32 at offset', () => {
      const list = new BufferList();
      const buf = bufferFrom([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc]);
      list.append(buf);

      assert.strictEqual(list.readUInt32LEAt(0), 0x78563412);
      assert.strictEqual(list.readUInt32LEAt(2), 0xbc9a7856);
    });

    it('should read across chunk boundaries', () => {
      const list = new BufferList();
      list.append(bufferFrom([0x12, 0x34]));
      list.append(bufferFrom([0x56, 0x78]));

      assert.strictEqual(list.readUInt32LEAt(0), 0x78563412);
    });

    it('should return null for out of bounds', () => {
      const list = new BufferList();
      list.append(bufferFrom([0x12, 0x34, 0x56]));

      assert.strictEqual(list.readUInt32LEAt(0), null);
      assert.strictEqual(list.readUInt32LEAt(1), null);
    });

    it('should handle empty list', () => {
      const list = new BufferList();
      assert.strictEqual(list.readUInt32LEAt(0), null);
    });
  });

  describe('readBytesAt', () => {
    it('should read bytes at offset', () => {
      const list = new BufferList();
      list.append(bufferFrom('hello world'));

      const result = list.readBytesAt(0, 5);
      assert.strictEqual(result.toString(), 'hello');
      assert.strictEqual(list.length, 11); // unchanged
    });

    it('should read across chunk boundaries', () => {
      const list = new BufferList();
      list.append(bufferFrom('hel'));
      list.append(bufferFrom('lo '));
      list.append(bufferFrom('world'));

      // Full buffer: "hello world" (11 chars)
      // Offset 2, length 6: positions 2-7 = "llo wo"
      const result = list.readBytesAt(2, 6);
      assert.strictEqual(result.toString(), 'llo wo');
    });

    it('should clamp length to available data', () => {
      const list = new BufferList();
      list.append(bufferFrom('hello'));

      // Request more than available
      const result = list.readBytesAt(2, 100);
      assert.strictEqual(result.toString(), 'llo');
      assert.strictEqual(result.length, 3);
    });

    it('should handle offset beyond length', () => {
      const list = new BufferList();
      list.append(bufferFrom('hello'));

      const result = list.readBytesAt(10, 5);
      assert.strictEqual(result.length, 0);
    });

    it('should handle zero length', () => {
      const list = new BufferList();
      list.append(bufferFrom('hello'));

      const result = list.readBytesAt(0, 0);
      assert.strictEqual(result.length, 0);
    });

    it('should handle negative offset', () => {
      const list = new BufferList();
      list.append(bufferFrom('hello'));

      const result = list.readBytesAt(-1, 3);
      assert.strictEqual(result.length, 0);
    });

    it('should return zero-copy slice for single-chunk reads', () => {
      const list = new BufferList();
      const original = bufferFrom('hello world');
      list.append(original);

      // Read from middle of single chunk
      const result = list.readBytesAt(3, 5);
      assert.strictEqual(result.toString(), 'lo wo');

      // Verify it's a slice sharing memory with original
      // Modifying original should affect result (zero-copy)
      original[3] = 'X'.charCodeAt(0);
      assert.strictEqual(result[0], 'X'.charCodeAt(0));
    });

    it('should return independent copy for multi-chunk reads', () => {
      const list = new BufferList();
      const chunk1 = bufferFrom('hel');
      const chunk2 = bufferFrom('lo world');
      list.append(chunk1);
      list.append(chunk2);

      // Read across chunk boundary
      const result = list.readBytesAt(2, 4);
      assert.strictEqual(result.toString(), 'llo ');

      // Verify it's an independent copy - modifying chunks should NOT affect result
      chunk1[2] = 'X'.charCodeAt(0);
      chunk2[0] = 'Y'.charCodeAt(0);
      assert.strictEqual(result.toString(), 'llo ');
    });
  });
});
