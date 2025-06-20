const assert = require('assert');
const rimraf2 = require('rimraf2');
const mkdirp = require('mkdirp-classic');
const Pinkie = require('pinkie-promise');

const EntriesIterator = require('../lib/EntriesIterator.cjs');
const loadEntries = require('../lib/loadEntries.cjs');
const validateFiles = require('../lib/validateFiles.cjs');

const constants = require('../lib/constants.cjs');
const TMP_DIR = constants.TMP_DIR;
const TARGET = constants.TARGET;

async function extract(iterator, dest, options) {
  const links = [];
  for await (const entry of iterator) {
    if (entry.type === 'link') links.unshift(entry);
    else if (entry.type === 'symlink') links.push(entry);
    else await entry.create(dest, options);
  }

  // create links then symlinks after directories and files
  for (const entry of links) await entry.create(dest, options);
}

describe('asyncIterator', () => {
  if (typeof Symbol === 'undefined' || !Symbol.asyncIterator) return;
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
    rimraf2(TMP_DIR, { disableGlob: true }, () => {
      mkdirp(TMP_DIR, callback);
    });
  });

  describe('happy path', () => {
    it('extract - no strip', async () => {
      const options = { now: new Date() };
      try {
        await extract(new EntriesIterator(entries), TARGET, options);
        await validateFiles(options, 'tar');
      } catch (err) {
        if (err) {
          done(err.message);
          return;
        }
      }
    });

    it('extract - strip 1', async () => {
      const options = { now: new Date(), strip: 1 };
      try {
        await extract(new EntriesIterator(entries), TARGET, options);
        await validateFiles(options, 'tar');
      } catch (err) {
        if (err) {
          done(err.message);
          return;
        }
      }
    });

    it('extract multiple times', async () => {
      const options = { now: new Date(), strip: 1 };
      try {
        await extract(new EntriesIterator(entries), TARGET, options);
        await validateFiles(options, 'tar');
        try {
          await extract(new EntriesIterator(entries), TARGET, options);
          assert.ok(false);
        } catch (err) {
          assert.ok(err);
        }
        await extract(new EntriesIterator(entries), TARGET, { force: true, ...options });
        await validateFiles(options, 'tar');
      } catch (err) {
        if (err) {
          done(err.message);
          return;
        }
      }
    });
  });

  describe('unhappy path', () => {
    it('should fail with too large strip', async () => {
      const options = { now: new Date(), strip: 2 };
      try {
        await extract(new EntriesIterator(entries), TARGET, options);
        assert.ok(false);
      } catch (err) {
        assert.ok(!!err);
      }
    });
  });
});
