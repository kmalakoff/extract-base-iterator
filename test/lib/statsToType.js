module.exports = function statsToType(stats) {
  if (stats.isDirectory()) return 'directory';
  if (stats.isSymbolicLink()) return 'symlink';
  if (stats.isFile()) return 'file';
};
