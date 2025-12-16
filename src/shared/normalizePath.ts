/**
 * Normalize archive entry path
 *
 * - Converts backslashes to forward slashes
 * - Removes empty segments
 * - Removes leading slashes
 *
 * Node 0.8+ compatible.
 */

export default function normalizePath(p: string): string {
  // Split on both forward and back slashes, filter empty segments, rejoin with forward slash
  const segments = p.split(/[/\\]/);
  const result: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].length > 0) {
      result.push(segments[i]);
    }
  }
  return result.join('/');
}
