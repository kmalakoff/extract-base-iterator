import Module from 'module';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

if (typeof setImmediate === 'undefined') global.setImmediate = _require('next-tick');
