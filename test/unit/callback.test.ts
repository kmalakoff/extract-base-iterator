import assert from 'assert';
import mkdirp from 'mkdirp-classic';
import rimraf2 from 'rimraf2';
import { TARGET, TMP_DIR } from '../lib/constants.ts';
import EntriesIterator from '../lib/EntriesIterator.ts';
import extract from '../lib/extract.ts';
import loadEntries from '../lib/loadEntries.ts';
import validateFiles from '../lib/validateFiles.ts';

describe('iterator', () => {
  const entries = loadEntries();
  beforeEach((callback) => {
    rimraf2(TMP_DIR, { disableGlob: true }, () => {
      mkdirp(TMP_DIR, callback);
    });
  });

  describe('happy path', () => {
    it('destroy iterator', () => {
      const iterator = new EntriesIterator(entries);
      iterator.destroy();
      assert.ok(true);
    });

    it('destroy entries', (done) => {
      const iterator = new EntriesIterator(entries);
      iterator.forEach(
        (entry): undefined => {
          entry.destroy();
        },
        (err) => {
          if (err) {
            done(err.message);
            return;
          }
          done();
        }
      );
    });

    it('extract - no strip - concurrency 1', (done) => {
      const options = { now: new Date(), concurrency: 1 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        if (err) {
          done(err.message);
          return;
        }

        validateFiles(options, 'tar', (err) => {
          if (err) {
            done(err.message);
            return;
          }
          done();
        });
      });
    });

    it('extract - no strip - concurrency Infinity', (done) => {
      const options = { now: new Date(), concurrency: Infinity };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        if (err) {
          done(err.message);
          return;
        }

        validateFiles(options, 'tar', (err) => {
          if (err) {
            done(err.message);
            return;
          }
          done();
        });
      });
    });

    it('extract - strip 1', (done) => {
      const options = { now: new Date(), strip: 1 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        if (err) {
          done(err.message);
          return;
        }

        validateFiles(options, 'tar', (err) => {
          if (err) {
            done(err.message);
            return;
          }
          done();
        });
      });
    });

    it('extract multiple times', (done) => {
      const options = { now: new Date(), strip: 1 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        if (err) {
          done(err.message);
          return;
        }

        validateFiles(options, 'tar', (err) => {
          if (err) {
            done(err.message);
            return;
          }

          extract(new EntriesIterator(entries), TARGET, options, (err) => {
            assert.ok(err);

            extract(new EntriesIterator(entries), TARGET, { force: true, ...options }, (err) => {
              if (err) {
                done(err.message);
                return;
              }

              validateFiles(options, 'tar', (err) => {
                if (err) {
                  done(err.message);
                  return;
                }
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('unhappy path', () => {
    it('should fail with too large strip', (done) => {
      const options = { now: new Date(), strip: 2 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        assert.ok(!!err);
        done();
      });
    });
  });
});
