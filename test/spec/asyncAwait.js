var assert = require('assert');
var rimraf = require('rimraf');
var Queue = require('queue-cb');
var generate = require('fs-generate');

var EntriesIterator = require('../lib/EntriesIterator');
var loadEntries = require('../lib/loadEntries');
var validateFiles = require('../lib/validateFiles');

var constants = require('../lib/constants');
var TMP_DIR = constants.TMP_DIR;
var TARGET = constants.TARGET;
var DATA_DIR = constants.DATA_DIR;
var STRUCTURE = constants.STRUCTURE;

async function extract(iterator, dest, options) {
  const links = [];
  let entry = await iterator.next();
  while (entry) {
    if (entry.type === 'symlink' || entry.type === 'link') links.push(entry);
    else await entry.create(dest, options);
    entry = await iterator.next();
  }

  // create links after directories and files
  for (entry of links) {
    await entry.create(dest, options);
  }
}

async function extractForEach(iterator, dest, options) {
  const links = [];
  await iterator.forEach(
    async function (entry) {
      if (entry.type === 'symlink' || entry.type === 'link') links.push(entry);
      else await entry.create(dest, options);
    },
    { concurrency: options.concurrency }
  );

  // create links after directories and files
  for (const entry of links) {
    await entry.create(dest, options);
  }
}

describe('asyncAwait', function () {
  var entries;
  beforeEach(function (callback) {
    var queue = new Queue(1);
    queue.defer(function (callback) {
      rimraf(TMP_DIR, function (err) {
        err && err.code !== 'EEXIST' ? callback(err) : callback();
      });
    });
    queue.defer(generate.bind(generate, DATA_DIR, STRUCTURE));
    queue.defer(function (callback) {
      loadEntries(DATA_DIR, function (err, _entries) {
        entries = _entries;
        callback(err);
      });
    });
    queue.await(callback);
  });

  describe('happy path', function () {
    it('extract entries - no strip - concurrency 1', async function () {
      var options = { now: new Date(), concurrency: 1 };
      try {
        await extract(new EntriesIterator(entries), TARGET, options);
        await validateFiles(options, 'tar');
      } catch (err) {
        assert.ok(!err);
      }
    });

    it('extract entries - no strip - concurrency Infinity', async function () {
      var options = { now: new Date(), concurrency: Infinity };
      try {
        await extract(new EntriesIterator(entries), TARGET, options);
        await validateFiles(options, 'tar');
      } catch (err) {
        assert.ok(!err);
      }
    });

    it('extract entries - no strip - forEach', async function () {
      var options = { now: new Date(), concurrency: Infinity };
      try {
        await extractForEach(new EntriesIterator(entries), TARGET, options);
        await validateFiles(options, 'tar');
      } catch (err) {
        assert.ok(!err);
      }
    });

    it('extract entries - strip 1', async function () {
      var options = { now: new Date(), strip: 1 };
      try {
        await extract(new EntriesIterator(entries), TARGET, options);
        await validateFiles(options, 'tar');
      } catch (err) {
        assert.ok(!err);
      }
    });

    it('extract multiple times', async function () {
      var options = { now: new Date(), strip: 1 };
      try {
        await extract(new EntriesIterator(entries), TARGET, options);
        await validateFiles(options, 'tar');
        await extract(new EntriesIterator(entries), TARGET, options);
        await validateFiles(options, 'tar');
      } catch (err) {
        assert.ok(!err);
      }
    });
  });

  describe('unhappy path', function () {
    it('should fail with too large strip', async function () {
      var options = { now: new Date(), strip: 2 };
      try {
        await extract(new EntriesIterator(entries), TARGET, options);
        assert.ok(false);
      } catch (err) {
        assert.ok(!!err);
      }
    });
  });
});
