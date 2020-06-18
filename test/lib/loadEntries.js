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
FileEntry.prototype._writeFile = function _writeFile(fullPath, options, callback) {
  fs.writeFile(fullPath, this.contents, callback);
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
        var relativeDenormalizedPath = relativePath.split(path.sep).join('/');
        var fullPath = path.join(directory, entry.path);

        switch (type) {
          case 'directory':
            results.push(new DirectoryEntry(assign({ path: relativeDenormalizedPath }, entry.stats)));
            break;
          case 'file':
            results.push(new FileEntry(assign({ path: relativeDenormalizedPath }, entry.stats), fs.readFileSync(fullPath)));
            break;
          case 'link':
            var fileEntry = find(entries, function (x) {
              return x.stats.ino === entry.stats.ino && x.basename.indexOf('link') !== 0;
            });
            var linkpath = path.join(basename, fileEntry.path);
            var linkDenormalizedPath = linkpath.split(path.sep).join('/');
            results.push(new LinkEntry(assign({ path: relativeDenormalizedPath, linkpath: linkDenormalizedPath }, entry.stats)));
            break;
          case 'symlink':
            var linkFullPath = fs.realpathSync(fullPath);
            // eslint-disable-next-line no-redeclare
            var linkpath = path.relative(path.dirname(fullPath), linkFullPath);
            // eslint-disable-next-line no-redeclare
            var linkDenormalizedPath = linkpath.split(path.sep).join('/');
            results.push(new SymbolicLinkEntry(assign({ path: relativeDenormalizedPath, linkpath: linkDenormalizedPath }, entry.stats)));
            break;
        }
      }
      err ? callback(err) : callback(null, results);
    }
  );
};
