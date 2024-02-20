"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return LinkEntry;
    }
});
var _path = /*#__PURE__*/ _interop_require_default(require("path"));
var _gracefulfs = /*#__PURE__*/ _interop_require_default(require("graceful-fs"));
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
    "path",
    "linkpath"
];
function LinkEntry(attributes, _type) {
    (0, _validateAttributes.default)(attributes, MANDATORY_ATTRIBUTES);
    Object.assign(this, attributes);
    if (this.basename === undefined) this.basename = _path.default.basename(this.path);
    if (this.type === undefined) this.type = "link";
}
LinkEntry.prototype.create = function create(dest, options, callback) {
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
            var normalizedLinkpath = _path.default.normalize(self.linkpath);
            var linkFullPath = _path.default.join(dest, (0, _stripPath.default)(normalizedLinkpath, options));
            var queue = new _queuecb.default(1);
            if (options.force) {
                queue.defer(function(callback) {
                    (0, _rimraf.default)(fullPath, function(err) {
                        err && err.code !== "ENOENT" ? callback(err) : callback();
                    });
                });
            }
            queue.defer(_mkpath.default.bind(null, _path.default.dirname(fullPath)));
            queue.defer(_gracefulfs.default.link.bind(_gracefulfs.default, linkFullPath, fullPath));
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
LinkEntry.prototype.destroy = function destroy() {};
/* CJS INTEROP */ if (exports.__esModule && exports.default) { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) exports.default[key] = exports[key]; module.exports = exports.default; }