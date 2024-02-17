// adapted from https://github.com/mafintosh/tar-fs
"use strict";
var fs = require("graceful-fs");
module.exports = function utimes(fullPath, entry, options, callback) {
    var now = options.now || new Date();
    fs.utimes(fullPath, now, new Date(entry.mtime), callback);
};

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  for (var key in exports) exports.default[key] = exports[key];
  module.exports = exports.default;
}