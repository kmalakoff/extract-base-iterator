var assert = require('assert');
var path = require('path');
var rimraf = require('rimraf');
var generate = require('fs-generate');
var statsSpys = require('fs-stats-spys');

var Iterator = require('../..');

var DATA_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp', 'data'));
var STRUCTURE = {
  'fixture.js': 'var thing = true;',
  symlink1: '~fixture.js',
  link1: ':fixture.js',
  'dir1/fixture.js': 'var thing = true;',
  symlink2: '~dir1/fixture.js',
  link2: ':dir1/fixture.js',
  'dir1/symlink1': '~dir1/fixture.js',
  'dir1/link1': ':dir1/fixture.js',
  'dir1/dir2/symlink1': '~dir1/fixture.js',
  'dir1/dir2/link1': ':dir1/fixture.js',
};

describe('async await', function () {
  beforeEach(function (done) {
    rimraf(TEST_DIR, function () {
      generate(DATA_DIR, STRUCTURE, done);
    });
  });

  it('should be default false', async function () {
    var spys = statsSpys();

    var iterator = new Iterator(TEST_DIR, {
      filter: function (entry) {
        spys(entry.stats);
      },
    });

    let value = await iterator.next();
    while (value) {
      assert.ok(typeof value.basename === 'string');
      assert.ok(typeof value.path === 'string');
      assert.ok(typeof value.fullPath === 'string');
      assert.ok(typeof value.stats === 'object');
      value = await iterator.next();
    }

    assert.ok(spys.callCount, 13);
  });

  it('Should find everything with no return', async function () {
    var spys = statsSpys();

    var iterator = new Iterator(TEST_DIR, {
      filter: function (entry) {
        spys(entry.stats);
      },
      lstat: true,
    });

    let value = await iterator.next();
    while (value) {
      assert.ok(typeof value.basename === 'string');
      assert.ok(typeof value.path === 'string');
      assert.ok(typeof value.fullPath === 'string');
      assert.ok(typeof value.stats === 'object');
      value = await iterator.next();
    }

    assert.equal(spys.dir.callCount, 5);
    assert.equal(spys.file.callCount, 5);
    assert.equal(spys.link.callCount, 2);
  });

  it('Should find everything with return true', async function () {
    var spys = statsSpys();

    var iterator = new Iterator(TEST_DIR, {
      filter: function (entry) {
        spys(entry.stats);
        return true;
      },
      lstat: true,
    });

    let value = await iterator.next();
    while (value) {
      assert.ok(typeof value.basename === 'string');
      assert.ok(typeof value.path === 'string');
      assert.ok(typeof value.fullPath === 'string');
      assert.ok(typeof value.stats === 'object');
      value = await iterator.next();
    }

    assert.equal(spys.dir.callCount, 5);
    assert.equal(spys.file.callCount, 5);
    assert.equal(spys.link.callCount, 2);
  });

  it('should propagate errors', async function () {
    var iterator = new Iterator(TEST_DIR, {
      filter: function () {
        return Promise.reject(new Error('Failed'));
      },
    });

    try {
      let value = await iterator.next();
      while (value) {
        assert.ok(typeof value.basename === 'string');
        assert.ok(typeof value.path === 'string');
        assert.ok(typeof value.fullPath === 'string');
        assert.ok(typeof value.stats === 'object');
        value = await iterator.next();
      }
    } catch (err) {
      assert.ok(!!err);
    }
  });
});
