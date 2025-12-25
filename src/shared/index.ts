/**
 * Shared utilities for iterator libraries
 *
 * These utilities are designed to be used by:
 * - zip-iterator
 * - 7z-iterator
 * - tar-iterator
 * - Any other archive iterator library
 *
 * All utilities support Node.js 0.8+
 */

import BufferList from './BufferList.ts';

export { BufferList };

/**
 * Type alias for Buffer or BufferList - both can be read byte-by-byte.
 * Use this when an API should accept either contiguous data (Buffer)
 * or chunked streaming data (BufferList).
 */
export type BufferLike = Buffer | BufferList;
export {
  allocBuffer,
  allocBufferUnsafe,
  bufferCompare,
  bufferConcat,
  bufferEquals,
  bufferFrom,
  bufferSliceCopy,
  createInflateRawStream,
  inflateRaw,
  isNaN,
  objectAssign,
  PassThrough,
  Readable,
  readUInt64LE,
  Transform,
  Writable,
  writeUInt64LE,
} from './compat.ts';
export { crc32, crc32Region, verifyCrc32, verifyCrc32Region } from './crc32.ts';
export { default as EntryStream } from './EntryStream.ts';
export { type CleanupFn, default as Lock } from './Lock.ts';
export { default as normalizePath } from './normalizePath.ts';
export { default as streamToString, type StreamToStringCallback } from './streamToString.ts';
export { default as stripPath } from './stripPath.ts';
