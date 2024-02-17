"use strict";
var path = require("path");
var compact = require("lodash.compact");
module.exports = function stripPath(relativePath, options) {
    var strip = options.strip || 0;
    if (!strip) return relativePath;
    var parts = compact(relativePath.split(path.sep));
    if (parts.length < strip) throw new Error("You cannot strip more levels than there are directories. Strip: ".concat(strip, ". Path: ").concat(relativePath));
    return parts.slice(strip).join(path.sep);
};

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  for (var key in exports) exports.default[key] = exports[key];
  module.exports = exports.default;
}