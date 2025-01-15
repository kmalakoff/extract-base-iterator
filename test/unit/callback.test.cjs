const assert = require('assert');
const rimraf2 = require('rimraf2');
const mkdirp = require('mkdirp-classic');

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
        (entry) => {
          entry.destroy();
        },
        (err) => {
          if (err) return done(err.message);
          done();
        }
      );
    });

    it('extract - no strip - concurrency 1', (done) => {
      const options = { now: new Date(), concurrency: 1 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        if (err) return done(err.message);

        validateFiles(options, 'tar', (err) => {
          if (err) return done(err.message);
          done();
        });
      });
    });

    it('extract - no strip - concurrency Infinity', (done) => {
      const options = { now: new Date(), concurrency: Infinity };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        if (err) return done(err.message);

        validateFiles(options, 'tar', (err) => {
          if (err) return done(err.message);
          done();
        });
      });
    });

    it('extract - strip 1', (done) => {
      const options = { now: new Date(), strip: 1 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        if (err) return done(err.message);

        validateFiles(options, 'tar', (err) => {
          if (err) return done(err.message);
          done();
        });
      });
    });

    it('extract multiple times', (done) => {
      const options = { now: new Date(), strip: 1 };
      extract(new EntriesIterator(entries), TARGET, options, (err) => {
        if (err) return done(err.message);

        validateFiles(options, 'tar', (err) => {
          if (err) return done(err.message);

          extract(new EntriesIterator(entries), TARGET, options, (err) => {
            assert.ok(err);

            extract(new EntriesIterator(entries), TARGET, { force: true, ...options }, (err) => {
              if (err) return done(err.message);

              validateFiles(options, 'tar', (err) => {
                if (err) return done(err.message);
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
