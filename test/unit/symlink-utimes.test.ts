import assert from 'assert';
import fs from 'fs';
import { safeRm } from 'fs-remove-compat';
import mkdirp from 'mkdirp-classic';
import path from 'path';
import url from 'url';

// Test demonstrating fs.utimes behavior on symlinks
// fs.utimes follows the symlink and tries to set times on the TARGET
// If the target doesn't exist, it fails with ENOENT

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '..', '..', '.tmp-symlink-test');

describe('symlink utimes behavior', () => {
  beforeEach((done) => {
    safeRm(TMP_DIR, () => mkdirp(TMP_DIR, done));
  });

  afterEach((done) => {
    safeRm(TMP_DIR, done);
  });

  it('fs.utimes on symlink with EXISTING target should succeed', (done) => {
    const targetPath = path.join(TMP_DIR, 'target.txt');
    const symlinkPath = path.join(TMP_DIR, 'link');

    // Create the target file first
    fs.writeFileSync(targetPath, 'hello');

    // Create symlink pointing to existing file
    fs.symlink(targetPath, symlinkPath, (err) => {
      if (err) return done(err);

      // fs.utimes should succeed because target exists
      fs.utimes(symlinkPath, new Date(), new Date(), (err) => {
        assert.ok(!err, 'utimes should succeed when symlink target exists');
        done();
      });
    });
  });

  it('fs.utimes on symlink with NON-EXISTING target should fail with ENOENT', (done) => {
    const symlinkPath = path.join(TMP_DIR, 'link');

    // Create symlink pointing to non-existent file (dangling symlink)
    fs.symlink('/nonexistent/path/file.txt', symlinkPath, (err) => {
      if (err) return done(err);

      // fs.utimes follows the symlink and tries to access the target
      // This should fail with ENOENT because target doesn't exist
      fs.utimes(symlinkPath, new Date(), new Date(), (err) => {
        assert.ok(err, 'utimes should fail when symlink target does not exist');
        assert.equal(err.code, 'ENOENT', 'should be ENOENT error');
        done();
      });
    });
  });

  it('fs.lutimes (if available) on symlink with NON-EXISTING target should succeed', function (done) {
    // fs.lutimes was added in Node 14.5.0
    // biome-ignore lint/suspicious/noExplicitAny: fs.lutimes not in older @types/node
    if (typeof (fs as any).lutimes !== 'function') {
      console.log('    (fs.lutimes not available, skipping)');
      this.skip();
      return;
    }

    const symlinkPath = path.join(TMP_DIR, 'link');

    // Create symlink pointing to non-existent file
    fs.symlink('/nonexistent/path/file.txt', symlinkPath, (err) => {
      if (err) return done(err);

      // fs.lutimes operates on the symlink itself, not following it
      // biome-ignore lint/suspicious/noExplicitAny: fs.lutimes not in older @types/node
      (fs as any).lutimes(symlinkPath, new Date(), new Date(), (err) => {
        assert.ok(!err, 'lutimes should succeed even when symlink target does not exist');
        done();
      });
    });
  });
});
