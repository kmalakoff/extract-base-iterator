import StackBaseIterator from 'stack-base-iterator';

import type { Entry } from './types.ts';

export default class ExtractBaseIterator extends StackBaseIterator<Entry> {}

export { default as DirectoryEntry } from './DirectoryEntry.ts';
export { default as FileEntry } from './FileEntry.ts';
export { default as LinkEntry } from './LinkEntry.ts';
export { default as SymbolicLinkEntry } from './SymbolicLinkEntry.ts';
// Shared utilities for iterator libraries
export * from './shared/index.ts';
export * from './types.ts';
export { default as waitForAccess } from './waitForAccess.ts';
