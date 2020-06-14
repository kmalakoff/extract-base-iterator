var path = require('path');
var fs = require('fs');
var inherits = require('inherits');
var assign = require('object-assign');
var find = require('lodash.find');
var Iterator = require('fs-iterator');

var BaseIterator = require('../..');
var entryToType = require('./entryToType');

var DirectoryEntry = BaseIterator.DirectoryEntry;
function FileEntry(attributes, contents) {
  BaseIterator.FileEntry.call(this, attributes);
  this.contents = contents;
}
inherits(FileEntry, BaseIterator.FileEntry);
FileEntry.prototype._writeFile = function _writeFile(dest, options, callback) {
  fs.writeFile(dest, this.contents, callback);
};
var LinkEntry = BaseIterator.LinkEntry;
var SymbolicLinkEntry = BaseIterator.SymbolicLinkEntry;

module.exports = function loadEntries(directory, callback) {
  var basename = path.basename(directory);
  var entries = [];
  entries.push(new DirectoryEntry(assign({ path: basename }, fs.statSync(directory))));

  var fsEntries = [];
  new Iterator(directory, { alwaysStat: true, lstat: true }).forEach(fsEntries.push.bind(fsEntries), function (err) {
    for (var index = 0; index < fsEntries.length; index++) {
      var fsEntry = fsEntries[index];
      var type = entryToType(fsEntry);
      var relativePath = path.join(basename, fsEntry.path);
      var fullPath = path.join(directory, fsEntry.path);
      switch (type) {
        case 'directory':
          entries.push(new DirectoryEntry(assign({ path: relativePath }, fsEntry.stats)));
          break;
        case 'file':
          entries.push(new FileEntry(assign({ path: relativePath }, fsEntry.stats), fs.readFileSync(fullPath)));
          break;
        case 'link':
        case 'symlink':
          var targetFullPath;

          if (type === 'link') {
            var fileEntry = find(fsEntries, function (x) {
              return x.stats.ino === fsEntry.stats.ino && x.basename.indexOf('link') !== 0;
            });
            targetFullPath = fileEntry.fullPath;
          } else targetFullPath = fs.realpathSync(fullPath);

          var targetPath = path.relative(path.dirname(fullPath), targetFullPath);
          var Link = type === 'symlink' ? SymbolicLinkEntry : LinkEntry;
          entries.push(new Link(assign({ path: relativePath, targetPath: targetPath }, fsEntry.stats)));
          break;
      }
    }
    err ? callback(err) : callback(null, entries);
  });
};
