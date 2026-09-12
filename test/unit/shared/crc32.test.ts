import assert from 'assert';
import { allocBuffer, bufferFrom, crc32, crc32Region, verifyCrc32, verifyCrc32Region } from 'extract-base-iterator';

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
