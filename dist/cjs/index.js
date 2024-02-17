"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
var _stackbaseiterator = /*#__PURE__*/ _interop_require_default(require("stack-base-iterator"));
var _DirectoryEntrycjs = /*#__PURE__*/ _interop_require_default(require("./DirectoryEntry.js"));
var _FileEntrycjs = /*#__PURE__*/ _interop_require_default(require("./FileEntry.js"));
var _LinkEntrycjs = /*#__PURE__*/ _interop_require_default(require("./LinkEntry.js"));
var _SymbolicLinkEntrycjs = /*#__PURE__*/ _interop_require_default(require("./SymbolicLinkEntry.js"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
_stackbaseiterator.default.DirectoryEntry = _DirectoryEntrycjs.default;
_stackbaseiterator.default.FileEntry = _FileEntrycjs.default;
_stackbaseiterator.default.LinkEntry = _LinkEntrycjs.default;
_stackbaseiterator.default.SymbolicLinkEntry = _SymbolicLinkEntrycjs.default;
var _default = _stackbaseiterator.default;

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  for (var key in exports) exports.default[key] = exports[key];
  module.exports = exports.default;
}