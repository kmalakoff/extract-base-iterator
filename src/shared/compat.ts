/**
 * Buffer Compatibility Layer for Node.js 0.8+
 *
 * Provides buffer utilities that work across all Node.js versions
 * WITHOUT modifying global Buffer object.
 *
 * Version history:
 * - Node 0.8-4.4: Only has `new Buffer()`, no `Buffer.alloc/from`
 * - Node 4.5+: Has `Buffer.alloc/from`, deprecates `new Buffer()`
 * - Node 10+: Warns or errors on `new Buffer()`
 *
 * Solution: Feature detection with graceful fallback in both directions.
 */

// Feature detection (runs once at module load)
var hasBufferAlloc = typeof Buffer.alloc === 'function';
var hasBufferAllocUnsafe = typeof Buffer.allocUnsafe === 'function';
var hasBufferFrom = typeof Buffer.from === 'function' && Buffer.from !== Uint8Array.from;

/**
 * Allocate a zero-filled buffer (safe)
 * - Uses Buffer.alloc() on Node 4.5+
 * - Falls back to new Buffer() + fill on Node 0.8-4.4
 */
export function allocBuffer(size: number): Buffer {
  if (hasBufferAlloc) {
    return Buffer.alloc(size);
  }
  // Legacy fallback: new Buffer() is uninitialized, must zero-fill
  var buf = new Buffer(size);
  buf.fill(0);
  return buf;
}

/**
 * Allocate a buffer without initialization (unsafe but faster)
 * - Uses Buffer.allocUnsafe() on Node 4.5+
 * - Falls back to new Buffer() on Node 0.8-4.4
 *
 * WARNING: Buffer contents are uninitialized and may contain sensitive data.
 * Only use when you will immediately overwrite all bytes.
 */
export function allocBufferUnsafe(size: number): Buffer {
  if (hasBufferAllocUnsafe) {
    return Buffer.allocUnsafe(size);
  }
  return new Buffer(size);
}

/**
 * Create a buffer from string, array, or existing buffer
 * - Uses Buffer.from() on Node 4.5+
 * - Falls back to new Buffer() on Node 0.8-4.4
 * - Handles Uint8Array conversion for Node 0.8 (crypto output compatibility)
 */
export function bufferFrom(data: string | number[] | Buffer | Uint8Array, encoding?: BufferEncoding): Buffer {
  if (hasBufferFrom) {
    if (typeof data === 'string') {
      return Buffer.from(data, encoding);
    }
    return Buffer.from(data as number[] | Buffer);
  }
  // Node 0.8 compatibility - deprecated Buffer constructor
  // For Uint8Array, convert to array first (needed for crypto output in Node 0.8)
  if (data instanceof Uint8Array && !(data instanceof Buffer)) {
    var arr: number[] = [];
    for (var i = 0; i < data.length; i++) {
      arr.push(data[i]);
    }
    return new Buffer(arr);
  }
  return new Buffer(data as string & number[], encoding);
}

/**
 * Compare two buffers or buffer regions
 * - Uses Buffer.compare() on Node 5.10+ (with offset support)
 * - Falls back to manual comparison on Node 0.8-5.9
 */
export function bufferCompare(source: Buffer, target: Buffer, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number {
  sourceStart = sourceStart || 0;
  sourceEnd = sourceEnd || source.length;
  targetStart = targetStart || 0;
  targetEnd = targetEnd || target.length;

  // Check if native compare with offset support exists (Node 5.10+)
  if (source.compare && source.compare.length >= 5) {
    return source.compare(target, targetStart, targetEnd, sourceStart, sourceEnd);
  }

  // Manual comparison for older Node versions
  var sourceLen = sourceEnd - sourceStart;
  var targetLen = targetEnd - targetStart;
  var len = Math.min(sourceLen, targetLen);

  for (var i = 0; i < len; i++) {
    var s = source[sourceStart + i];
    var t = target[targetStart + i];
    if (s !== t) return s < t ? -1 : 1;
  }

  return sourceLen - targetLen;
}

/**
 * Check if buffer region equals byte array
 * Useful for magic number detection without Buffer.from()
 */
export function bufferEquals(buf: Buffer, offset: number, expected: number[]): boolean {
  if (offset + expected.length > buf.length) return false;
  for (var i = 0; i < expected.length; i++) {
    if (buf[offset + i] !== expected[i]) return false;
  }
  return true;
}

/**
 * Copy buffer region to new buffer
 * Works on all Node versions
 */
export function bufferSliceCopy(buf: Buffer, start: number, end: number): Buffer {
  var result = allocBuffer(end - start);
  buf.copy(result, 0, start, end);
  return result;
}

/**
 * Read 64-bit unsigned integer (little-endian)
 * Uses two 32-bit reads since BigInt not available until Node 10.4
 *
 * WARNING: Only accurate for values < Number.MAX_SAFE_INTEGER (2^53 - 1)
 * This covers files up to ~9 PB which is practical for all real use cases.
 */
export function readUInt64LE(buf: Buffer, offset: number): number {
  var low = buf.readUInt32LE(offset);
  var high = buf.readUInt32LE(offset + 4);
  return high * 0x100000000 + low;
}

/**
 * Write 64-bit unsigned integer (little-endian)
 * Same precision limitation as readUInt64LE
 */
export function writeUInt64LE(buf: Buffer, value: number, offset: number): void {
  var low = value >>> 0;
  var high = (value / 0x100000000) >>> 0;
  buf.writeUInt32LE(low, offset);
  buf.writeUInt32LE(high, offset + 4);
}

/**
 * Concatenate buffers - compatible with Node 0.8
 * Handles crypto output which may not be proper Buffer instances in old Node.
 *
 * NOTE: This function is primarily needed for AES decryption compatibility
 * in Node 0.8 where crypto output may not be proper Buffer instances.
 * Libraries not using crypto can use native Buffer.concat() directly.
 */
export function bufferConcat(list: (Buffer | Uint8Array)[], totalLength?: number): Buffer {
  // Calculate actual total length first
  var actualLength = 0;
  for (var i = 0; i < list.length; i++) {
    actualLength += list[i].length;
  }

  // Use specified totalLength or actual length
  var targetLength = totalLength !== undefined ? totalLength : actualLength;

  // Check if all items are proper Buffers AND no truncation needed
  // (Node 0.8's Buffer.concat doesn't handle truncation well)
  var allBuffers = true;
  for (var j = 0; j < list.length; j++) {
    if (!(list[j] instanceof Buffer)) {
      allBuffers = false;
      break;
    }
  }
  if (allBuffers && targetLength >= actualLength) {
    return Buffer.concat(list as Buffer[], targetLength);
  }

  // Manual concat for mixed types or when truncation is needed
  var result = allocBuffer(targetLength);
  var offset = 0;
  for (var k = 0; k < list.length && offset < targetLength; k++) {
    var buf = list[k];
    for (var l = 0; l < buf.length && offset < targetLength; l++) {
      result[offset++] = buf[l];
    }
  }
  return result;
}

/**
 * Node 0.8 compatible isNaN (Number.isNaN didn't exist until ES2015)
 * Uses self-comparison: NaN is the only value not equal to itself
 */
// biome-ignore lint/suspicious/noShadowRestrictedNames: Legacy compatibility
export function isNaN(value: number): boolean {
  // biome-ignore lint/suspicious/noSelfCompare: NaN check pattern
  return value !== value;
}
