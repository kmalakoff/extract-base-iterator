import assert from 'assert';
import { DirectoryEntry } from 'extract-base-iterator';
import fs from 'fs';
import { safeRm } from 'fs-remove-compat';
import mkdirp from 'mkdirp-classic';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '..', '..', '.tmp-directory-entry-test');
const EXTRACT_DIR = path.join(TMP_DIR, 'extracted');

describe('DirectoryEntry', () => {
  beforeEach((done) => {
    safeRm(TMP_DIR, () => mkdirp(EXTRACT_DIR, done));
  });

  afterEach((done) => {
    safeRm(TMP_DIR, done);
  });

  it('creates a normal directory (happy path)', (done) => {
    const entry = new DirectoryEntry({ path: 'subdir/newdir', mode: 0o755, mtime: Date.now() });
    entry.create(EXTRACT_DIR, {}, (err) => {
      if (err) return done(err);
      assert.ok(fs.statSync(path.join(EXTRACT_DIR, 'subdir/newdir')).isDirectory(), 'directory should exist');
      done();
    });
  });

  it('rejects traversal in path', (done) => {
    const entry = new DirectoryEntry({ path: '../outside-dir', mode: 0o755, mtime: Date.now() });
    entry.create(EXTRACT_DIR, {}, (err: NodeJS.ErrnoException) => {
      assert.ok(err, 'should error');
      assert.strictEqual(err.code, 'ETRAVERSAL');
      assert.ok(!fs.existsSync(path.join(TMP_DIR, 'outside-dir')), 'outside dir must not exist');
      done();
    });
  });
});
