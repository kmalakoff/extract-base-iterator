import compact from 'lodash.compact';
import path from 'path';

import type { ExtractOptions } from '../types.ts';

export default function stripPath(relativePath: string, options: ExtractOptions): string {
  const strip = options.strip || 0;
  if (!strip) return relativePath;
  const parts = compact(relativePath.split(path.sep));
  if (parts.length < strip) throw new Error(`You cannot strip more levels than there are directories. Strip: ${strip}. Path: ${relativePath}`);
  return parts.slice(strip).join(path.sep);
}
