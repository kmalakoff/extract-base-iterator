import path from 'path';
import { stringStartsWith } from './compat.ts';

export default function safeJoinPath(dest: string, relPath: string): string {
  const resolvedDest = path.resolve(dest);
  const resolvedFull = path.resolve(dest, relPath);
  if (resolvedFull !== resolvedDest && !stringStartsWith(resolvedFull, resolvedDest + path.sep)) {
    const err = new Error(`Path traversal detected: '${relPath}' escapes destination '${dest}'`) as NodeJS.ErrnoException;
    err.code = 'ETRAVERSAL';
    throw err;
  }
  return resolvedFull;
}
