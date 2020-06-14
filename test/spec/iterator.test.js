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

function extract(iterator, dest, options, callback) {
  var links = [];
  iterator.forEach(
    function (entry, callback) {
      if (entry.type === 'symlink' || entry.type === 'link') {
        links.push(entry);
        return callback();
      }
      entry.create(dest, options, callback);
    },
    { callbacks: true },
    function (err) {
      if (err) return callback(err);

      var queue = new Queue();
      for (var index = 0; index < links.length; index++) {
        var entry = links[index];
        queue.defer(entry.create.bind(entry, dest, options));
      }
      queue.await(callback);
    }
  );
}

function extractPromise(iterator, dest, options, callback) {
  var links = [];
  iterator
    .forEach(function (entry) {
      if (entry.type === 'symlink' || entry.type === 'link') {
        links.push(entry);
        return;
      }
      return entry.create(dest, options);
    })
    .then(function () {
      var queue = new Queue();
      for (var index = 0; index < links.length; index++) {
        (function (entry) {
          queue.defer(function (callback) {
            entry.create(dest, options).then(callback).catch(callback);
          });
        })(links[index]);
      }
      queue.await(callback);
    })
    .catch(callback);
}

describe.only('iterator', function () {
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
    it('extract entries - no strip', function (done) {
      var options = { now: new Date() };
      extract(new EntriesIterator(entries), TARGET, options, function (err) {
        assert.ok(!err);

        validateFiles(options, 'tar', function (err) {
          assert.ok(!err);
          done();
        });
      });
    });

    it('extract entries - no strip - promise', function (done) {
      if (typeof Promise === 'undefined') return done();

      var options = { now: new Date() };
      extractPromise(new EntriesIterator(entries), TARGET, options, function (err) {
        assert.ok(!err);

        validateFiles(options, 'tar', function (err) {
          assert.ok(!err);
          done();
        });
      });
    });

    it('extract entries - strip 1', function (done) {
      var options = { now: new Date(), strip: 1 };
      extract(new EntriesIterator(entries), TARGET, options, function (err) {
        assert.ok(!err);

        validateFiles(options, 'tar', function (err) {
          assert.ok(!err);
          done();
        });
      });
    });

    it('extract multiple times', function (done) {
      var options = { now: new Date(), strip: 1 };
      extract(new EntriesIterator(entries), TARGET, options, function (err) {
        assert.ok(!err);

        validateFiles(options, 'tar', function (err) {
          assert.ok(!err);

          extract(new EntriesIterator(entries), TARGET, options, function (err) {
            assert.ok(!err);

            validateFiles(options, 'tar', function (err) {
              assert.ok(!err);
              done();
            });
          });
        });
      });
    });
  });

  describe('unhappy path', function () {
    it('should fail with too large strip', function (done) {
      var options = { now: new Date(), strip: 2 };
      extract(new EntriesIterator(entries), TARGET, options, function (err) {
        assert.ok(!!err);
        done();
      });
    });
  });
});
