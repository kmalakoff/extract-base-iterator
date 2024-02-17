"use strict";
var fs = require("graceful-fs");
module.exports = function lstatReal(path, callback) {
    fs.realpath(path, function realpathCallback(err, realpath) {
        err ? callback(err) : fs.lstat(realpath, callback);
    });
};

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  for (var key in exports) exports.default[key] = exports[key];
  module.exports = exports.default;
}