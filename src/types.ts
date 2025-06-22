import type { Mode } from 'fs';
import type { StackOptions } from 'stack-base-iterator';

export interface ExtractOptions extends StackOptions {
  force?: boolean;
  strip?: number;
  now?: Date;
}

export type NoParamCallback = (error?: Error) => void;
export type WriteFileFn = (path: string, options: object, callback: NoParamCallback) => void;

export interface FileAttributes {
  mode: Mode;
  mtime: number;
  path: string;
}

export interface DirectoryAttributes {
  mode: Mode;
  mtime: number | Date;
  path: string;
}

export interface LinkAttributes {
  mode: Mode;
  mtime: number;
  path: string;
  linkpath: string;
}

import type { default as DirectoryEntry } from './DirectoryEntry.ts';
import type { default as FileEntry } from './FileEntry.ts';
import type { default as LinkEntry } from './LinkEntry.ts';
import type { default as SymbolicLinkEntry } from './SymbolicLinkEntry.ts';
export type Entry = DirectoryEntry | FileEntry | LinkEntry | SymbolicLinkEntry;

export interface AbstractEntry {
  mode: Mode;
  mtime: number;
  path: string;
  basename: string;
  type: string;
  linkpath?: string;
  uid?: number;
  gid?: number;
}
