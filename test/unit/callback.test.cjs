const assert = require('assert');
const rimraf2 = require('rimraf2');
const mkpath = require('mkpath');

const EntriesIterator = require('../lib/EntriesIterator.cjs');
const loadEntries = require('../lib/loadEntries.cjs');
const validateFiles = require('../lib/validateFiles.cjs');
const extract = require('../lib/extract.cjs');

const constants = require('../lib/constants.cjs');
const TMP_DIR = constants.TMP_DIR;
const TARGET = constants.TARGET;

describe('iterator', () => {
  const entries = loadEntries();
  beforeEach((callback) => {
    rimraf2(TMP_DIR, { disableGlob: true }, (err) => {
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

            extract(new EntriesIterator(entries), TARGET, Object.assign({ force: true }, options), (err) => {
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
