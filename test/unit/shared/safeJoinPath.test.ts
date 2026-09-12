import assert from 'assert';
import { safeJoinPath } from 'extract-base-iterator';
import path from 'path';

describe('safeJoinPath', () => {
  const DEST = path.resolve('/tmp/dest');

  function assertTraversal(relPath: string) {
    assert.throws(
      () => safeJoinPath(DEST, relPath),
      (err: NodeJS.ErrnoException) => err.code === 'ETRAVERSAL'
    );
  }

  it('throws for one-level escape', () => {
    assertTraversal('../evil.txt');
  });

  it('throws for deep escape', () => {
    assertTraversal('../../etc/passwd');
  });

  it('throws for nested escape', () => {
    assertTraversal('safe/../../outside.txt');
  });

  it('throws for absolute path outside dest', () => {
    assertTraversal('/etc/passwd');
  });

  it('throws for trailing parent-dir reference', () => {
    assertTraversal('../');
  });

  it('returns resolved path for normal relative path', () => {
    const result = safeJoinPath(DEST, 'safe/file.txt');
    assert.strictEqual(result, path.join(DEST, 'safe/file.txt'));
  });

  it('returns dest for "."', () => {
    const result = safeJoinPath(DEST, '.');
    assert.strictEqual(result, DEST);
  });

  it('allows filename starting with ".."', () => {
    const result = safeJoinPath(DEST, '..hidden');
    assert.strictEqual(result, path.join(DEST, '..hidden'));
  });
});
