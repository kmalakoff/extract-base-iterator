import assert from 'assert';
import { LinkEntry } from 'extract-base-iterator';
import fs from 'fs';
import { safeRm } from 'fs-remove-compat';
import mkdirp from 'mkdirp-classic';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '..', '..', '.tmp-link-entry-test');
const EXTRACT_DIR = path.join(TMP_DIR, 'extracted');

describe('LinkEntry', () => {
  beforeEach((done) => {
    safeRm(TMP_DIR, () => {
      mkdirp(EXTRACT_DIR, (err) => {
        if (err) return done(err);
        fs.writeFile(path.join(EXTRACT_DIR, 'target.txt'), 'hello', done);
      });
    });
  });

  afterEach((done) => {
    safeRm(TMP_DIR, done);
  });

  it('creates a normal hardlink (happy path)', (done) => {
    const entry = new LinkEntry({ path: 'hardlink', linkpath: 'target.txt', mode: 0o644, mtime: Date.now() });
    entry.create(EXTRACT_DIR, {}, (err) => {
      if (err) return done(err);
      assert.ok(fs.existsSync(path.join(EXTRACT_DIR, 'hardlink')), 'hardlink should exist');
      done();
    });
  });

  it('rejects traversal in path', (done) => {
    const entry = new LinkEntry({ path: '../outside-link', linkpath: 'target.txt', mode: 0o644, mtime: Date.now() });
    entry.create(EXTRACT_DIR, {}, (err: NodeJS.ErrnoException) => {
      assert.ok(err);
      assert.strictEqual(err.code, 'ETRAVERSAL');
      assert.ok(!fs.existsSync(path.join(TMP_DIR, 'outside-link')), 'outside link must not exist');
      done();
    });
  });

  it('rejects relative linkpath escape', (done) => {
    const entry = new LinkEntry({ path: 'inside-link', linkpath: '../outside-target', mode: 0o644, mtime: Date.now() });
    entry.create(EXTRACT_DIR, {}, (err: NodeJS.ErrnoException) => {
      assert.ok(err);
      assert.strictEqual(err.code, 'ETRAVERSAL');
      assert.ok(!fs.existsSync(path.join(EXTRACT_DIR, 'inside-link')), 'link must not be created');
      done();
    });
  });

  it('rejects absolute linkpath', (done) => {
    const entry = new LinkEntry({ path: 'inside-link', linkpath: '/etc/passwd', mode: 0o644, mtime: Date.now() });
    entry.create(EXTRACT_DIR, {}, (err: NodeJS.ErrnoException) => {
      assert.ok(err);
      assert.strictEqual(err.code, 'ETRAVERSAL');
      assert.ok(!fs.existsSync(path.join(EXTRACT_DIR, 'inside-link')), 'link must not be created');
      done();
    });
  });
});
