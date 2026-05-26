import assert from 'assert';
import fs from 'fs';
import { safeRm } from 'fs-remove-compat';
import mkdirp from 'mkdirp-classic';
import path from 'path';
import url from 'url';
import { FileEntry } from '../lib/loadEntries.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '..', '..', '.tmp-file-entry-test');
const EXTRACT_DIR = path.join(TMP_DIR, 'extracted');

describe('FileEntry', () => {
  beforeEach((done) => {
    safeRm(TMP_DIR, () => mkdirp(EXTRACT_DIR, done));
  });

  afterEach((done) => {
    safeRm(TMP_DIR, done);
  });

  it('writes a normal file (happy path)', (done) => {
    const entry = new FileEntry({ path: 'subdir/file.txt', mode: 0o644, mtime: Date.now() }, 'hello');
    entry.create(EXTRACT_DIR, {}, (err) => {
      if (err) return done(err);
      const written = path.join(EXTRACT_DIR, 'subdir/file.txt');
      assert.ok(fs.existsSync(written), 'file should exist');
      assert.strictEqual(fs.readFileSync(written, 'utf8'), 'hello');
      done();
    });
  });

  it('rejects traversal in path', (done) => {
    const entry = new FileEntry({ path: '../outside.txt', mode: 0o644, mtime: Date.now() }, 'evil');
    entry.create(EXTRACT_DIR, {}, (err?: Error | null) => {
      assert.ok(err, 'should error');
      assert.strictEqual((err as unknown as NodeJS.ErrnoException).code, 'ETRAVERSAL');
      assert.ok(!fs.existsSync(path.join(TMP_DIR, 'outside.txt')), 'outside file must not exist');
      done();
    });
  });

  it('rejects strip-bypass traversal', (done) => {
    // After path.normalize, '../../outside.txt' is preserved. After strip:1, it becomes
    // '../outside.txt', which still escapes dest — safeJoinPath must catch it.
    const entry = new FileEntry({ path: '../../outside.txt', mode: 0o644, mtime: Date.now() }, 'evil');
    entry.create(EXTRACT_DIR, { strip: 1 }, (err?: Error | null) => {
      assert.ok(err, 'should error');
      assert.strictEqual((err as unknown as NodeJS.ErrnoException).code, 'ETRAVERSAL');
      assert.ok(!fs.existsSync(path.join(TMP_DIR, 'outside.txt')), 'outside file must not exist');
      done();
    });
  });
});
