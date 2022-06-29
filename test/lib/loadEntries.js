var fs = require('graceful-fs');
var path = require('path');
var inherits = require('inherits');
var find = require('lodash.find');

var BaseIterator = require('../..');

var DirectoryEntry = BaseIterator.DirectoryEntry;
function FileEntry(attributes, contents) {
  BaseIterator.FileEntry.call(this, attributes);
  this.contents = contents;
}
inherits(FileEntry, BaseIterator.FileEntry);
FileEntry.prototype._writeFile = function _writeFile(fullPath, options, callback) {
  // eslint-disable-next-line n/no-deprecated-api
  fs.writeFile(fullPath, this.contents, callback);
};
var LinkEntry = BaseIterator.LinkEntry;
var SymbolicLinkEntry = BaseIterator.SymbolicLinkEntry;

var constants = require('./constants');
var CONTENTS = constants.CONTENTS;
var STRUCTURE = {
  'data/fixture.js': CONTENTS,
  'data/symlink1': '~data/fixture.js',
  'data/link1': ':data/fixture.js',
  'data/dir1/fixture.js': CONTENTS,
  'data/symlink2': '~data/dir1/fixture.js',
  'data/link2': ':data/dir1/fixture.js',
  'data/dir1/symlink1': '~data/dir1/fixture.js',
  'data/dir1/link1': ':data/dir1/fixture.js',
  'data/dir1/dir2/symlink1': '~data/dir1/fixture.js',
  'data/dir1/dir2/link1': ':data/dir1/fixture.js',
  'data/dir3/symlink1': '~data/dir1/fixture.js',
  'data/dir3/link1': ':data/dir1/fixture.js',
};
var DMODE = parseInt(755, 8);
var FMODE = parseInt(644, 8);
var SMODE = parseInt(755, 8);
var LMODE = parseInt(644, 8);

function addDirectories(relativePath, entries) {
  var parts = relativePath.split('/');
  for (var index = 0; index < parts.length - 1; index++) {
    var directoryPath = parts.slice(0, index + 1).join('/');

    if (
      !find(entries, function (entry) {
        return entry instanceof DirectoryEntry && entry.path === directoryPath;
      })
    )
      entries.push(new DirectoryEntry({ path: directoryPath, mode: DMODE, mtime: new Date() }));
  }
}

module.exports = function loadEntries() {
  var entries = [];
  for (var relativePath in STRUCTURE) {
    var contents = STRUCTURE[relativePath];
    addDirectories(relativePath, entries);
    if (contents[0] === ':') entries.push(new LinkEntry({ path: relativePath, linkpath: contents.slice(1), mode: LMODE, mtime: new Date() }));
    else if (contents[0] === '~') {
      var fullPath = relativePath.split('/').join(path.sep);
      var linkFullPath = contents.slice(1).split('/').join(path.sep);
      var linkpath = path.relative(path.dirname(fullPath), linkFullPath);
      var linkDenormalizedPath = linkpath.split(path.sep).join('/');
      entries.push(new SymbolicLinkEntry({ path: relativePath, linkpath: linkDenormalizedPath, mode: SMODE, mtime: new Date() }));
    } else entries.push(new FileEntry({ path: relativePath, mode: FMODE, mtime: new Date() }, contents));
  }
  return entries;
};
