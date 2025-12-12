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

// ESM-compatible require - works in both CJS and ESM
import Module from 'module';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

// Feature detection (runs once at module load)
const hasBufferAlloc = typeof Buffer.alloc === 'function';
const hasBufferAllocUnsafe = typeof Buffer.allocUnsafe === 'function';
const hasBufferFrom = typeof Buffer.from === 'function' && Buffer.from !== Uint8Array.from;

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
  const buf = new Buffer(size);
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
    const arr: number[] = [];
    for (let i = 0; i < data.length; i++) {
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
  const sourceLen = sourceEnd - sourceStart;
  const targetLen = targetEnd - targetStart;
  const len = Math.min(sourceLen, targetLen);

  for (let i = 0; i < len; i++) {
    const s = source[sourceStart + i];
    const t = target[targetStart + i];
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
  for (let i = 0; i < expected.length; i++) {
    if (buf[offset + i] !== expected[i]) return false;
  }
  return true;
}

/**
 * Copy buffer region to new buffer
 * Works on all Node versions
 */
export function bufferSliceCopy(buf: Buffer, start: number, end: number): Buffer {
  const result = allocBuffer(end - start);
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
  const low = buf.readUInt32LE(offset);
  const high = buf.readUInt32LE(offset + 4);
  return high * 0x100000000 + low;
}

/**
 * Write 64-bit unsigned integer (little-endian)
 * Same precision limitation as readUInt64LE
 */
export function writeUInt64LE(buf: Buffer, value: number, offset: number): void {
  const low = value >>> 0;
  const high = (value / 0x100000000) >>> 0;
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
  let actualLength = 0;
  for (let i = 0; i < list.length; i++) {
    actualLength += list[i].length;
  }

  // Use specified totalLength or actual length
  const targetLength = totalLength !== undefined ? totalLength : actualLength;

  // Check if all items are proper Buffers AND no truncation needed
  // (Node 0.8's Buffer.concat doesn't handle truncation well)
  let allBuffers = true;
  for (let j = 0; j < list.length; j++) {
    if (!(list[j] instanceof Buffer)) {
      allBuffers = false;
      break;
    }
  }
  if (allBuffers && targetLength >= actualLength) {
    return Buffer.concat(list as Buffer[], targetLength);
  }

  // Manual concat for mixed types or when truncation is needed
  const result = allocBuffer(targetLength);
  let offset = 0;
  for (let k = 0; k < list.length && offset < targetLength; k++) {
    const buf = list[k];
    for (let l = 0; l < buf.length && offset < targetLength; l++) {
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

/**
 * Decompress raw DEFLATE data (no zlib/gzip header)
 * - Uses native zlib.inflateRawSync() on Node 0.11.12+
 * - Falls back to pako for Node 0.8-0.10
 *
 * Version history:
 * - Node 0.8-0.10: No zlib sync methods, use pako
 * - Node 0.11.12+: zlib.inflateRawSync available
 */
// Feature detection for native zlib sync methods (Node 0.11.12+)
let zlib: typeof import('zlib') | null = null;
try {
  zlib = _require('zlib');
} catch (_e) {
  // zlib not available (shouldn't happen in Node.js)
}
const hasNativeInflateRaw = zlib !== null && typeof zlib.inflateRawSync === 'function';

export function inflateRaw(input: Buffer): Buffer {
  if (hasNativeInflateRaw && zlib) {
    return zlib.inflateRawSync(input);
  }
  // Fallback to pako for Node 0.8-0.10
  const pako = _require('pako');
  return bufferFrom(pako.inflateRaw(input));
}

/**
 * Create a streaming raw DEFLATE decompressor (Transform stream)
 * Decompresses data incrementally to avoid holding full output in memory.
 *
 * - Uses native zlib.createInflateRaw() on Node 0.11.12+
 * - Falls back to pako-based Transform for Node 0.8-0.10
 *
 * @returns A Transform stream that decompresses raw DEFLATE data
 */
// Check for native streaming inflate (Node 0.11.12+ has createInflateRaw)
// biome-ignore lint/suspicious/noExplicitAny: createInflateRaw not in older TS definitions
const hasNativeStreamingInflate = zlib !== null && typeof (zlib as any).createInflateRaw === 'function';

export function createInflateRawStream(): NodeJS.ReadWriteStream {
  if (hasNativeStreamingInflate && zlib) {
    // Use native zlib streaming Transform
    // biome-ignore lint/suspicious/noExplicitAny: createInflateRaw not in older TS definitions
    return (zlib as any).createInflateRaw();
  }

  // Fallback to pako-based Transform for Node 0.8-0.10
  // Use readable-stream for Node 0.8 compatibility
  const Transform = _require('readable-stream').Transform;
  const pako = _require('pako');

  const inflate = new pako.Inflate({ raw: true, chunkSize: 16384 });
  const transform = new Transform();
  const pendingChunks: Buffer[] = [];
  let ended = false;

  // Pako calls onData synchronously during push()
  inflate.onData = (chunk: Uint8Array) => {
    pendingChunks.push(bufferFrom(chunk));
  };

  inflate.onEnd = (status: number) => {
    ended = true;
    if (status !== 0) {
      transform.emit('error', new Error(`Inflate error: ${inflate.msg || 'unknown'}`));
    }
  };

  transform._transform = function (chunk: Buffer, _encoding: string, callback: (err?: Error) => void) {
    try {
      inflate.push(chunk, false);
      // Push any pending decompressed chunks
      while (pendingChunks.length > 0) {
        this.push(pendingChunks.shift());
      }
      callback();
    } catch (err) {
      callback(err as Error);
    }
  };

  transform._flush = function (callback: (err?: Error) => void) {
    try {
      inflate.push(new Uint8Array(0), true); // Signal end
      // Push any remaining decompressed chunks
      while (pendingChunks.length > 0) {
        this.push(pendingChunks.shift());
      }
      if (ended && inflate.err) {
        callback(new Error(`Inflate error: ${inflate.msg || 'unknown'}`));
      } else {
        callback();
      }
    } catch (err) {
      callback(err as Error);
    }
  };

  return transform;
}

/**
 * setImmediate wrapper for Node.js 0.8+
 * - Uses native setImmediate on Node 0.10+
 * - Falls back to next-tick for Node 0.8
 */
const hasSetImmediate = typeof setImmediate === 'function';
const _nextTick: (fn: () => void) => void = hasSetImmediate ? setImmediate : _require('next-tick');

export function setImmediateFn(fn: () => void): void {
  _nextTick(fn);
}

/**
 * Object.assign wrapper for Node.js 0.8+
 * - Uses native Object.assign on Node 4.0+
 * - Falls back to manual property copy on Node 0.8-3.x
 */
const hasObjectAssign = typeof Object.assign === 'function';
const _hasOwnProperty = Object.prototype.hasOwnProperty;

export function objectAssign<T, U>(target: T, source: U): T & U {
  if (hasObjectAssign) {
    return Object.assign(target, source);
  }
  for (const key in source) {
    if (_hasOwnProperty.call(source, key)) {
      // biome-ignore lint/suspicious/noExplicitAny: Generic object assignment for Node 0.8 compat
      (target as any)[key] = (source as any)[key];
    }
  }
  return target as T & U;
}
