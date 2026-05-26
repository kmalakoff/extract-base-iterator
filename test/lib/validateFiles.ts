import assert from 'assert';
import cr from 'cr';
import fs, { type Stats } from 'fs';
import Iterator, { type Entry } from 'fs-iterator';
import statsSpys from 'fs-stats-spys';
import path from 'path';

import { CONTENTS, TARGET, TMP_DIR } from './constants.ts';

type Callback = (err?: Error) => void;

export default function validateFiles(options: Record<string, unknown> | string, _type?: Callback | string, callback?: Callback): void | Promise<void> {
  const cb: Callback = typeof _type === 'function' ? _type : (callback as Callback);
  const type_ = typeof _type === 'function' ? undefined : _type;

  if (typeof cb === 'function') {
    const opts = typeof options === 'string' ? { type: options } : options;
    const type = (opts.type as string | undefined) || type_;

    if (type === undefined) {
      const dataPath = TMP_DIR;
      fs.readdir(dataPath, (err, files) => {
        if (err) return cb(err);
        assert.equal(files.length, 1);
        assert.deepEqual(files.sort(), ['target']);
        assert.equal(cr(fs.readFileSync(path.join(dataPath, files[0])).toString()), CONTENTS);
        cb();
      });
    } else if (type === 'js' || type === '.js') {
      const dataPath = TARGET;
      fs.readdir(dataPath, (err, files) => {
        if (err) return cb(err);
        assert.equal(files.length, 1);
        assert.ok(~['fixture.js', 'fixture-js'].indexOf(files[0]));
        assert.equal(cr(fs.readFileSync(path.join(dataPath, files[0])).toString()), CONTENTS);
        cb();
      });
    } else if (type === 'js.gz' || type === '.js.gz') {
      const dataPath = TARGET;
      fs.readdir(dataPath, (err, files) => {
        if (err) return cb(err);
        assert.equal(files.length, 1);
        assert.ok(~['fixture.js.gz', 'fixture-js.gz'].indexOf(files[0]));
        assert.equal(cr(fs.readFileSync(path.join(dataPath, files[0])).toString()), CONTENTS);
        cb();
      });
    } else {
      const dataPath = !opts.strip ? path.join(TARGET, 'data') : TARGET;
      const spys = statsSpys();
      new Iterator(dataPath, { lstat: true }).forEach(
        (entry: Entry): void => {
          spys(entry.stats as Stats);
          if ((entry.stats as Stats).isFile()) {
            assert.equal(cr(fs.readFileSync(entry.fullPath).toString()), CONTENTS);
          } else if ((entry.stats as Stats).isSymbolicLink()) {
            assert.equal(cr(fs.readFileSync(fs.realpathSync(entry.fullPath)).toString()), CONTENTS);
          }
        },
        (err) => {
          if (err) return cb(err);
          assert.equal(spys.dir.callCount, 3);
          assert.equal(spys.file.callCount, 7);
          assert.equal(spys.link.callCount, 5);
          cb();
        }
      );
    }
    return;
  }
  return new Promise((resolve, reject) => validateFiles(options, type_ as string, (err?: Error) => (err ? reject(err) : resolve())));
}
