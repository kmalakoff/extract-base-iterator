const assert = require('assert');
const rimraf = require('rimraf');
const mkpath = require('mkpath');
const Queue = require('queue-cb');
const assign = require('just-extend');

const EntriesIterator = require('../lib/EntriesIterator');
const loadEntries = require('../lib/loadEntries');
const validateFiles = require('../lib/validateFiles');

const constants = require('../lib/constants');
const TMP_DIR = constants.TMP_DIR;
const TARGET = constants.TARGET;

function extract(iterator, dest, options, callback) {
  const links = [];
  iterator.forEach(
    (entry, callback) => {
      if (entry.type === 'link') {
        links.unshift(entry);
        callback();
      } else if (entry.type === 'symlink') {
        links.push(entry);
        callback();
      } else entry.create(dest, options, callback);
    },
    { callbacks: true, concurrency: options.concurrency },
    (err) => {
      if (err) return callback(err);

      // create links after directories and files
      const queue = new Queue(1);
      for (let index = 0; index < links.length; index++) {
        const entry = links[index];
        queue.defer(entry.create.bind(entry, dest, options));
      }
      queue.await(callback);
    }
  );
}

function extractPromise(iterator, dest, options, callback) {
  const links = [];
  iterator
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

describe('iterator', () => {
  const entries = loadEntries();
  beforeEach((callback) => {
    rimraf(TMP_DIR, (err) => {
      if (err && err.code !== 'EEXIST') return callback(err);
      mkpath(TMP_DIR, callback);
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
        (entry) => {
          entry.destroy();
        },
        (err) => {
          assert.ok(!err);
          done();
        }
      );
    });

    it('extract - no strip - concurrency 1', (done) => {
      const options = { now: new Date(), concurrency: 1 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        assert.ok(!err);

        validateFiles(options, 'tar', (err) => {
          assert.ok(!err);
          done();
        });
      });
    });

    it('extract - no strip - concurrency Infinity', (done) => {
      const options = { now: new Date(), concurrency: Infinity };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        assert.ok(!err);

        validateFiles(options, 'tar', (err) => {
          assert.ok(!err);
          done();
        });
      });
    });

    it('extract - no strip - promise', (done) => {
      if (typeof Promise === 'undefined') return done();

      const options = { now: new Date() };
      extractPromise(new EntriesIterator(entries), TARGET, options, (err) => {
        assert.ok(!err);

        validateFiles(options, 'tar', (err) => {
          assert.ok(!err);
          done();
        });
      });
    });

    it('extract - strip 1', (done) => {
      const options = { now: new Date(), strip: 1 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        assert.ok(!err);

        validateFiles(options, 'tar', (err) => {
          assert.ok(!err);
          done();
        });
      });
    });

    it('extract multiple times', (done) => {
      const options = { now: new Date(), strip: 1 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        assert.ok(!err);

        validateFiles(options, 'tar', (err) => {
          assert.ok(!err);

          extract(new EntriesIterator(entries), TARGET, options, (err) => {
            assert.ok(err);

            extract(new EntriesIterator(entries), TARGET, assign({ force: true }, options), (err) => {
              assert.ok(!err);

              validateFiles(options, 'tar', (err) => {
                assert.ok(!err);
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
