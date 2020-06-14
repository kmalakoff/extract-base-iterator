var path = require('path');
var fs = require('fs');
var inherits = require('inherits');
var assign = require('object-assign');
var find = require('lodash.find');
var Iterator = require('fs-iterator');
var normalizeStats = require('normalize-stats');
var toStats = require('big-int-stats/lib/toStats');

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
  var results = [];
  results.push(new DirectoryEntry(assign({ path: basename }, fs.statSync(directory))));

  var entries = [];
  new Iterator(directory, { alwaysStat: true, lstat: true }).forEach(
    function (entry) {
      entry.stats = toStats(normalizeStats(entry.stats));
      entries.push(entry);
    },
    function (err) {
      for (var index = 0; index < entries.length; index++) {
        var entry = entries[index];
        var type = entryToType(entry);
        var relativePath = path.join(basename, entry.path);
        var fullPath = path.join(directory, entry.path);
        switch (type) {
          case 'directory':
            results.push(new DirectoryEntry(assign({ path: relativePath }, entry.stats)));
            break;
          case 'file':
            results.push(new FileEntry(assign({ path: relativePath }, entry.stats), fs.readFileSync(fullPath)));
            break;
          case 'link':
          case 'symlink':
            var targetFullPath;

            if (type === 'link') {
              var fileEntry = find(entries, function (x) {
                return x.stats.ino === entry.stats.ino && x.basename.indexOf('link') !== 0;
              });
              targetFullPath = fileEntry.fullPath;
            } else targetFullPath = fs.realpathSync(fullPath);

            var targetPath = path.relative(path.dirname(fullPath), targetFullPath);
            var Link = type === 'symlink' ? SymbolicLinkEntry : LinkEntry;
            results.push(new Link(assign({ path: relativePath, targetPath: targetPath }, entry.stats)));
            break;
        }
      }
      err ? callback(err) : callback(null, results);
    }
  );
};
