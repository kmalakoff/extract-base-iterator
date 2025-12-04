import assert from 'assert';
import { safeRm } from 'fs-remove-compat';
import mkdirp from 'mkdirp-classic';
import Pinkie from 'pinkie-promise';
import Queue from 'queue-cb';
import { TARGET, TMP_DIR } from '../lib/constants.ts';
import EntriesIterator from '../lib/EntriesIterator.ts';
import loadEntries from '../lib/loadEntries.ts';
import validateFiles from '../lib/validateFiles.ts';

function extract(iterator, dest, options, callback) {
  const links = [];
  iterator
    // biome-ignore lint/suspicious/useIterableCallbackReturn: Not an iterable
    .forEach(
      (entry) => {
        if (entry.type === 'link') links.unshift(entry);
        else if (entry.type === 'symlink') links.push(entry);
        else return entry.create(dest, options);
      },
      { concurrency: options.concurrency }
    )
    .then(() => {
      // create links after directories and files
      const queue = new Queue(1);
      for (let index = 0; index < links.length; index++) {
        ((entry) => {
          queue.defer((callback) => {
            entry.create(dest, options).then(callback).catch(callback);
          });
        })(links[index]);
      }
      queue.await(callback);
    })
    .catch(callback);
}

describe('promise', () => {
  (() => {
    // patch and restore promise
    if (typeof global === 'undefined') return;
    const globalPromise = global.Promise;
    before(() => {
      global.Promise = Pinkie;
    });
    after(() => {
      global.Promise = globalPromise;
    });
  })();

  const entries = loadEntries();
  beforeEach((callback) => {
    safeRm(TMP_DIR, () => {
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
