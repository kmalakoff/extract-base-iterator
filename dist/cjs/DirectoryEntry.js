"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return DirectoryEntry;
    }
});
var _path = /*#__PURE__*/ _interop_require_default(require("path"));
var _justextend = /*#__PURE__*/ _interop_require_default(require("just-extend"));
var _mkpath = /*#__PURE__*/ _interop_require_default(require("mkpath"));
var _queuecb = /*#__PURE__*/ _interop_require_default(require("queue-cb"));
var _chmod = /*#__PURE__*/ _interop_require_default(require("./fs/chmod.js"));
var _chown = /*#__PURE__*/ _interop_require_default(require("./fs/chown.js"));
var _utimes = /*#__PURE__*/ _interop_require_default(require("./fs/utimes.js"));
var _stripPath = /*#__PURE__*/ _interop_require_default(require("./stripPath.js"));
var _validateAttributes = /*#__PURE__*/ _interop_require_default(require("./validateAttributes.js"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
var MANDATORY_ATTRIBUTES = [
    "mode",
    "mtime",
    "path"
];
function DirectoryEntry(attributes) {
    (0, _validateAttributes.default)(attributes, MANDATORY_ATTRIBUTES);
    (0, _justextend.default)(this, attributes);
    if (this.type === undefined) this.type = "directory";
    if (this.basename === undefined) this.basename = _path.default.basename(this.path);
}
DirectoryEntry.prototype.create = function create(dest, options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = null;
    }
    var self = this;
    if (typeof callback === "function") {
        options = options || {};
        try {
            var normalizedPath = _path.default.normalize(self.path);
            var fullPath = _path.default.join(dest, (0, _stripPath.default)(normalizedPath, options));
            // do not check for the existence of the directory but allow out-of-order calling
            var queue = new _queuecb.default(1);
            queue.defer(_mkpath.default.bind(null, fullPath));
            queue.defer(_chmod.default.bind(null, fullPath, self, options));
            queue.defer(_chown.default.bind(null, fullPath, self, options));
            queue.defer(_utimes.default.bind(null, fullPath, self, options));
            return queue.await(callback);
        } catch (err) {
            return callback(err);
        }
    }
    return new Promise(function createPromise(resolve, reject) {
        self.create(dest, options, function createCallback(err, done) {
            err ? reject(err) : resolve(done);
        });
    });
};
DirectoryEntry.prototype.destroy = function destroy() {};
/* CJS INTEROP */ if (exports.__esModule && exports.default) { module.exports = exports.default; for (var key in exports) module.exports[key] = exports[key]; }