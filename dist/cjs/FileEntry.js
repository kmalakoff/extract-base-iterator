"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return FileEntry;
    }
});
var _path = /*#__PURE__*/ _interop_require_default(require("path"));
var _justextend = /*#__PURE__*/ _interop_require_default(require("just-extend"));
var _mkpath = /*#__PURE__*/ _interop_require_default(require("mkpath"));
var _queuecb = /*#__PURE__*/ _interop_require_default(require("queue-cb"));
var _rimraf = /*#__PURE__*/ _interop_require_default(require("rimraf"));
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
function FileEntry(attributes) {
    (0, _validateAttributes.default)(attributes, MANDATORY_ATTRIBUTES);
    (0, _justextend.default)(this, attributes);
    if (this.basename === undefined) this.basename = _path.default.basename(this.path);
    if (this.type === undefined) this.type = "file";
    if (this._writeFile === undefined) throw new Error("File self missing _writeFile. Please implement this method in your subclass");
}
FileEntry.prototype.create = function create(dest, options, callback) {
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
            var queue = new _queuecb.default(1);
            if (options.force) {
                queue.defer(function(callback) {
                    (0, _rimraf.default)(fullPath, function(err) {
                        err && err.code !== "ENOENT" ? callback(err) : callback();
                    });
                });
            }
            queue.defer(_mkpath.default.bind(null, _path.default.dirname(fullPath)));
            queue.defer(this._writeFile.bind(this, fullPath, options));
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
FileEntry.prototype.destroy = function destroy() {};
/* CJS INTEROP */ if (exports.__esModule && exports.default) { module.exports = exports.default; for (var key in exports) module.exports[key] = exports[key]; }