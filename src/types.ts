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
  mtime: number;
  path: string;
}

export interface LinkAttributes {
  mode: Mode;
  mtime: number;
  path: string;
  linkpath: string;
}

export interface Entry {
  mode: Mode;
  mtime: number;
  path: string;
  basename: string;
  type: string;
  linkpath?: string;
  uid?: number;
  gid?: number;
}
