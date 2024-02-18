"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return validateAttributes;
    }
});
function validateAttributes(attributes, keys) {
    var key;
    for(var index = 0; index < keys.length; index++){
        key = keys[index];
        if (attributes[key] === undefined) throw new Error("Missing attribute ".concat(key, ".Attributes ").concat(JSON.stringify(attributes)));
    }
}
/* CJS INTEROP */ if (exports.__esModule && exports.default) { module.exports = exports.default; for (var key in exports) module.exports[key] = exports[key]; }