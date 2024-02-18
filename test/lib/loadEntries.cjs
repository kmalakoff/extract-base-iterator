const fs = require('graceful-fs');
const path = require('path');
const inherits = require('inherits');
const find = require('lodash.find');

const BaseIterator = require('extract-base-iterator');

const DirectoryEntry = BaseIterator.DirectoryEntry;
function FileEntry(attributes, contents) {
  BaseIterator.FileEntry.call(this, attributes);
  this.contents = contents;
}
inherits(FileEntry, BaseIterator.FileEntry);
FileEntry.prototype._writeFile = function _writeFile(fullPath, _options, callback) {
  fs.writeFile(fullPath, this.contents, callback);
};
const LinkEntry = BaseIterator.LinkEntry;
const SymbolicLinkEntry = BaseIterator.SymbolicLinkEntry;

const constants = require('./constants.cjs');
const CONTENTS = constants.CONTENTS;
const STRUCTURE = {
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
const DMODE = parseInt(755, 8);
const FMODE = parseInt(644, 8);
const SMODE = parseInt(755, 8);
const LMODE = parseInt(644, 8);

function addDirectories(relativePath, entries) {
  const parts = relativePath.split('/');
  for (let index = 0; index < parts.length - 1; index++) {
    const directoryPath = parts.slice(0, index + 1).join('/');

    if (!find(entries, (entry) => entry instanceof DirectoryEntry && entry.path === directoryPath)) entries.push(new DirectoryEntry({ path: directoryPath, mode: DMODE, mtime: new Date() }));
  }
}

module.exports = function loadEntries() {
  const entries = [];
  for (const relativePath in STRUCTURE) {
    const contents = STRUCTURE[relativePath];
    addDirectories(relativePath, entries);
    if (contents[0] === ':') entries.push(new LinkEntry({ path: relativePath, linkpath: contents.slice(1), mode: LMODE, mtime: new Date() }));
    else if (contents[0] === '~') {
      const fullPath = relativePath.split('/').join(path.sep);
      const linkFullPath = contents.slice(1).split('/').join(path.sep);
      const linkpath = path.relative(path.dirname(fullPath), linkFullPath);
      const linkDenormalizedPath = linkpath.split(path.sep).join('/');
      entries.push(new SymbolicLinkEntry({ path: relativePath, linkpath: linkDenormalizedPath, mode: SMODE, mtime: new Date() }));
    } else entries.push(new FileEntry({ path: relativePath, mode: FMODE, mtime: new Date() }, contents));
  }
  return entries;
};
