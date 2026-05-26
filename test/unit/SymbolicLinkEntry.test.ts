import assert from 'assert';
import fs from 'fs';
import { safeRm } from 'fs-remove-compat';
import mkdirp from 'mkdirp-classic';
import path from 'path';
import url from 'url';
import SymbolicLinkEntry from '../../src/SymbolicLinkEntry.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '..', '..', '.tmp-symlink-entry-test');

describe('SymbolicLinkEntry', () => {
  beforeEach((done) => {
    safeRm(TMP_DIR, () => mkdirp(TMP_DIR, done));
  });

  afterEach((done) => {
    safeRm(TMP_DIR, done);
  });

  it('should create symlink pointing to existing target', (done) => {
    // Create target file first
    const targetPath = path.join(TMP_DIR, 'target.txt');
    fs.writeFileSync(targetPath, 'hello');

    const entry = new SymbolicLinkEntry({
      path: 'link',
      linkpath: 'target.txt', // relative path to target
      mode: 0o777,
      mtime: Date.now(),
    });

    entry.create(TMP_DIR, {}, (err) => {
      if (err) return done(err);

      const symlinkPath = path.join(TMP_DIR, 'link');
      assert.ok(fs.lstatSync(symlinkPath).isSymbolicLink(), 'should be a symlink');
      assert.equal(fs.readlinkSync(symlinkPath), 'target.txt', 'should point to target.txt');
      done();
    });
  });

  it('should create symlink pointing to non-existing target (dangling symlink)', (done) => {
    // This test demonstrates the Node 0.8 issue:
    // SymbolicLinkEntry.create() calls fs.utimes on the symlink
    // fs.utimes follows the symlink and fails with ENOENT if target doesn't exist
    //
    // EXPECTED BEHAVIOR: Should succeed even for dangling symlinks
    // - On Node 14.5+: use fs.lutimes which operates on the symlink itself
    // - On Node < 14.5: skip setting times on symlinks (no good alternative)

    const entry = new SymbolicLinkEntry({
      path: 'link',
      linkpath: './nonexistent-target.txt', // dangling symlink (relative)
      mode: 0o777,
      mtime: Date.now(),
    });

    entry.create(TMP_DIR, {}, (err) => {
      // Should NOT fail - the symlink should be created successfully
      // even if the target doesn't exist
      assert.ok(!err, `should not fail for dangling symlinks: ${err ? err.message : ''}`);

      const symlinkPath = path.join(TMP_DIR, 'link');
      assert.ok(fs.lstatSync(symlinkPath).isSymbolicLink(), 'should be a symlink');
      done();
    });
  });

  describe('path traversal', () => {
    it('happy path — relative target within dest', (done) => {
      // target.txt resolves to {TMP_DIR}/a/target.txt (inside dest)
      mkdirp(path.join(TMP_DIR, 'a'), (err) => {
        if (err) return done(err);
        fs.writeFile(path.join(TMP_DIR, 'a', 'target.txt'), 'hello', (writeErr) => {
          if (writeErr) return done(writeErr);
          const entry = new SymbolicLinkEntry({
            path: 'a/b/link',
            linkpath: '../target.txt',
            mode: 0o777,
            mtime: Date.now(),
          });
          entry.create(TMP_DIR, {}, (createErr) => {
            if (createErr) return done(createErr);
            assert.ok(fs.lstatSync(path.join(TMP_DIR, 'a/b/link')).isSymbolicLink(), 'should be a symlink');
            done();
          });
        });
      });
    });

    it('rejects traversal in path', (done) => {
      const entry = new SymbolicLinkEntry({
        path: '../outside-symlink',
        linkpath: 'target.txt',
        mode: 0o777,
        mtime: Date.now(),
      });
      entry.create(TMP_DIR, {}, (err?: Error | null) => {
        assert.ok(err);
        assert.strictEqual((err as unknown as NodeJS.ErrnoException).code, 'ETRAVERSAL');
        assert.ok(!fs.existsSync(path.join(TMP_DIR, '..', 'outside-symlink')), 'symlink must not be created');
        done();
      });
    });

    it('rejects relative linkpath escape', (done) => {
      const entry = new SymbolicLinkEntry({
        path: 'inside-symlink',
        linkpath: '../../outside-target',
        mode: 0o777,
        mtime: Date.now(),
      });
      entry.create(TMP_DIR, {}, (err?: Error | null) => {
        assert.ok(err);
        assert.strictEqual((err as unknown as NodeJS.ErrnoException).code, 'ETRAVERSAL');
        assert.ok(!fs.existsSync(path.join(TMP_DIR, 'inside-symlink')), 'symlink must not be created');
        done();
      });
    });

    it('rejects absolute linkpath', (done) => {
      const entry = new SymbolicLinkEntry({
        path: 'inside-symlink',
        linkpath: '/etc/passwd',
        mode: 0o777,
        mtime: Date.now(),
      });
      entry.create(TMP_DIR, {}, (err?: Error | null) => {
        assert.ok(err);
        assert.strictEqual((err as unknown as NodeJS.ErrnoException).code, 'ETRAVERSAL');
        assert.ok(!fs.existsSync(path.join(TMP_DIR, 'inside-symlink')), 'symlink must not be created');
        done();
      });
    });
  });
});
