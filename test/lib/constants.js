var path = require('path');

var TMP_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp'));
var TARGET = path.resolve(path.join(TMP_DIR, 'target'));
var CONTENTS = '// eslint-disable-next-line no-unused-vars\nvar thing = true;\n';

module.exports = {
  TMP_DIR: TMP_DIR,
  TARGET: TARGET,
  CONTENTS: CONTENTS,
};
