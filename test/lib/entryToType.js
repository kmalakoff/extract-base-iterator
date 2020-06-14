module.exports = function entryToType(entry) {
  if (entry.stats.isDirectory()) return 'directory';
  if (entry.stats.isSymbolicLink()) return 'symlink';
  if (entry.stats.isFile()) {
    return entry.basename.indexOf('link') === 0 ? 'link' : 'file';
  }
};
