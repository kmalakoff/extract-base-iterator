var path = require('path');
var fs = require('fs');
var inherits = require('inherits');
var assign = require('object-assign');
var Iterator = require('fs-iterator');

var BaseIterator = require('../..');
var statsToType = require('./statsToType');

var DirectoryEntry = BaseIterator.DirectoryEntry;
function FileEntry(attributes, contents) {
  BaseIterator.FileEntry.call(this, attributes);
  this.contents = contents;
}
inherits(FileEntry, BaseIterator.FileEntry);
FileEntry.prototype._writeFile = function _writeFile(dest, options, callback) {
  fs.writeFile(dest, this.contents, callback);
};
var SymbolicLinkEntry = BaseIterator.SymbolicLinkEntry;

module.exports = function loadentries(directory, callback) {
  var basename = path.basename(directory);
  var entries = [];

  entries.push(new DirectoryEntry(assign({ path: basename }, fs.statSync(directory))));
  new Iterator(directory, { alwaysStat: true, lstat: true }).forEach(
    function (entry) {
      var type = statsToType(entry.stats);
      var relativePath = path.join(basename, entry.path);
      var fullPath = path.join(directory, entry.path);
      switch (type) {
        case 'directory':
          return entries.push(new DirectoryEntry(assign({ path: relativePath }, entry.stats)));
        case 'file':
          return entries.push(new FileEntry(assign({ path: relativePath }, entry.stats), fs.readFileSync(fullPath)));
        case 'symlink':
          var targetFullPath = fs.realpathSync(fullPath);
          var targetPath = path.join(basename, path.relative(path.dirname(fullPath), targetFullPath));
          return entries.push(new SymbolicLinkEntry(assign({ path: relativePath, targetPath: targetPath }, entry.stats)));
      }
    },
    function (err) {
      err ? callback(err) : callback(null, entries);
    }
  );
};
