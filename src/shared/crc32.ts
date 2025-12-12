/**
 * CRC32 calculation for archive formats
 *
 * Uses IEEE polynomial 0xEDB88320 (same as ZIP, 7z, PNG, gzip, etc.)
 * All bit operations (>>>, ^, &) work correctly in Node 0.8
 *
 * This is the standard CRC-32 algorithm used by:
 * - ZIP/PKZIP
 * - 7-Zip
 * - PNG
 * - gzip
 * - Ethernet
 */

// Pre-computed lookup table for performance
const CRC32_TABLE: number[] = [];

// Initialize table at module load time
(function initTable() {
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      if ((c & 1) !== 0) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    CRC32_TABLE[i] = c >>> 0; // Ensure unsigned
  }
})();

/**
 * Calculate CRC32 of a buffer
 * @param buf - Buffer to calculate CRC32 for
 * @param initial - Optional initial CRC value (for streaming calculation)
 * @returns CRC32 value as unsigned 32-bit integer
 */
export function crc32(buf: Buffer, initial?: number): number {
  let crc = initial === undefined ? 0xffffffff : ~initial >>> 0;

  for (let i = 0; i < buf.length; i++) {
    const index = (crc ^ buf[i]) & 0xff;
    crc = CRC32_TABLE[index] ^ (crc >>> 8);
  }

  return ~crc >>> 0; // Return unsigned
}

/**
 * Calculate CRC32 of a buffer region
 * @param buf - Buffer containing data
 * @param offset - Start offset in buffer
 * @param length - Number of bytes to process
 * @param initial - Optional initial CRC value
 * @returns CRC32 value as unsigned 32-bit integer
 */
export function crc32Region(buf: Buffer, offset: number, length: number, initial?: number): number {
  let crc = initial === undefined ? 0xffffffff : ~initial >>> 0;
  const end = offset + length;

  for (let i = offset; i < end; i++) {
    const index = (crc ^ buf[i]) & 0xff;
    crc = CRC32_TABLE[index] ^ (crc >>> 8);
  }

  return ~crc >>> 0; // Return unsigned
}

/**
 * Verify CRC32 matches expected value
 * @param buf - Buffer to verify
 * @param expected - Expected CRC32 value
 * @returns true if CRC matches, false otherwise
 */
export function verifyCrc32(buf: Buffer, expected: number): boolean {
  return crc32(buf) === expected >>> 0;
}

/**
 * Verify CRC32 of a buffer region matches expected value
 * @param buf - Buffer containing data
 * @param offset - Start offset in buffer
 * @param length - Number of bytes to verify
 * @param expected - Expected CRC32 value
 * @returns true if CRC matches, false otherwise
 */
export function verifyCrc32Region(buf: Buffer, offset: number, length: number, expected: number): boolean {
  return crc32Region(buf, offset, length) === expected >>> 0;
}
