var path = require('path');

var TMP_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp'));
var TARGET = path.resolve(path.join(TMP_DIR, 'target'));
var DATA_DIR = path.resolve(path.join(TMP_DIR, 'data'));
var CONTENTS = '// eslint-disable-next-line no-unused-vars\nvar thing = true;\n';
var STRUCTURE = {
  'fixture.js': CONTENTS,
  symlink1: '~fixture.js',
  link1: ':fixture.js',
  'dir1/fixture.js': CONTENTS,
  symlink2: '~dir1/fixture.js',
  link2: ':dir1/fixture.js',
  'dir1/symlink1': '~dir1/fixture.js',
  'dir1/link1': ':dir1/fixture.js',
  'dir1/dir2/symlink1': '~dir1/fixture.js',
  'dir1/dir2/link1': ':dir1/fixture.js',
  'dir3/symlink1': '~dir1/fixture.js',
  'dir3/link1': ':dir1/fixture.js',
};

module.exports = {
  TMP_DIR: TMP_DIR,
  TARGET: TARGET,
  DATA_DIR: DATA_DIR,
  CONTENTS: CONTENTS,
  STRUCTURE: STRUCTURE,
};
