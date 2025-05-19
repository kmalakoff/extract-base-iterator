import type { Mode } from 'fs';

import type { StackOptions } from 'stack-base-iterator';

export interface ExtractOptions extends StackOptions {}

export type Callback = (error?: Error) => void;
export type WriteFileFn = (path: string, options: object, callback: Callback) => void;

export interface FileAttributes {
  mode: Mode;
  mtime: number;
  path: string;
}

export interface DirectoryAttributes {
  mode: Mode;
  mtime: number;
  path: string;
}

export interface LinkAttributes {
  mode: Mode;
  mtime: number;
  path: string;
  linkpath: string;
}
