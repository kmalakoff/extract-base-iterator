"use strict";
module.exports = function validateAttributes(attributes, keys) {
    var key;
    for(var index = 0; index < keys.length; index++){
        key = keys[index];
        if (attributes[key] === undefined) throw new Error("Missing attribute ".concat(key, ".Attributes ").concat(JSON.stringify(attributes)));
    }
};

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  for (var key in exports) exports.default[key] = exports[key];
  module.exports = exports.default;
}