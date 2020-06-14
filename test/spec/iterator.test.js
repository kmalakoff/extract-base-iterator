var assert = require('assert');
var path = require('path');
var rimraf = require('rimraf');
var mkpath = require('mkpath');
var inherits = require('inherits');
var Queue = require('queue-cb');

var BaseIterator = require('../..');
var loadentries = require('../lib/loadentries');
var validateFiles = require('../lib/validateFiles');

var TMP_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp'));
var TARGET = path.resolve(path.join(TMP_DIR, 'target'));
var DATA_DIR = path.resolve(path.join(__dirname, '..', 'data'));

function EntryIterator(entries) {
  BaseIterator.call(this);
  this.entries = entries.slice();

  var self = this;
  function next() {
    if (self.done) return;
    if (!self.entries.length) return self.end();

    // push next
    self.entries.push(self.entries.shift());
    self.stack.push(next);
    self.resume();
  }
  next();
}
inherits(EntryIterator, BaseIterator);

function extract(iterator, dest, options, callback) {
  var links = [];
  iterator.forEach(
    function (entry, callback) {
      if (entry.type === 'symlink') {
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
      if (entry.type === 'symlink') {
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
  before(function (callback) {
    loadentries(DATA_DIR, function (err, _entries) {
      entries = _entries;
      callback(err);
    });
  });

  beforeEach(function (callback) {
    rimraf(TMP_DIR, function (err) {
      if (err && err.code !== 'EEXIST') return callback(err);
      mkpath(TMP_DIR, callback);
    });
  });

  describe('happy path', function () {
    it('extract entries - no strip', function (done) {
      var options = { now: new Date() };
      extract(new EntryIterator(entries), TARGET, options, function (err) {
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
      extractPromise(new EntryIterator(entries), TARGET, options, function (err) {
        assert.ok(!err);

        validateFiles(options, 'tar', function (err) {
          assert.ok(!err);
          done();
        });
      });
    });

    it('extract entries - strip 1', function (done) {
      var options = { now: new Date(), strip: 1 };
      extract(new EntryIterator(entries), TARGET, options, function (err) {
        assert.ok(!err);

        validateFiles(options, 'tar', function (err) {
          assert.ok(!err);
          done();
        });
      });
    });

    it('extract multiple times', function (done) {
      var options = { now: new Date(), strip: 1 };
      extract(new EntryIterator(entries), TARGET, options, function (err) {
        assert.ok(!err);

        validateFiles(options, 'tar', function (err) {
          assert.ok(!err);

          extract(new EntryIterator(entries), TARGET, options, function (err) {
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
      extract(new EntryIterator(entries), TARGET, options, function (err) {
        assert.ok(!!err);
        done();
      });
    });
  });
});
