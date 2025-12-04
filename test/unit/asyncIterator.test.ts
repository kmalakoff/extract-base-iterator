import assert from 'assert';
import { safeRm } from 'fs-remove-compat';
import mkdirp from 'mkdirp-classic';
import Pinkie from 'pinkie-promise';
import { TARGET, TMP_DIR } from '../lib/constants.ts';
import EntriesIterator from '../lib/EntriesIterator.ts';
import loadEntries from '../lib/loadEntries.ts';
import validateFiles from '../lib/validateFiles.ts';

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
    safeRm(TMP_DIR, () => {
      mkdirp(TMP_DIR, callback);
    });
  });

  describe('happy path', () => {
    it('extract - no strip', async () => {
      const options = { now: new Date() };
      await extract(new EntriesIterator(entries), TARGET, options);
      await validateFiles(options, 'tar');
    });

    it('extract - strip 1', async () => {
      const options = { now: new Date(), strip: 1 };
      await extract(new EntriesIterator(entries), TARGET, options);
      await validateFiles(options, 'tar');
    });

    it('extract multiple times', async () => {
      const options = { now: new Date(), strip: 1 };
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
