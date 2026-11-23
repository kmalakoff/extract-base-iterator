# Changelog

All notable changes to extract-base-iterator are documented here.

## [3.5.0] - 2026-11-23

### Added

- Export `destroyStream(stream, err?)` and `tmpdir()` (with `os-shim` fallback on Node 0.8) from the package root.

### Fixed

- `allocBuffer(0)`, `allocBufferUnsafe(0)`, and `bufferConcat([])` no longer emit Node's `DEP0005` deprecation warning on Node 10 and later.
- `getMaxBufferLength()` now reads the runtime's actual buffer limit from `buffer.constants.MAX_LENGTH` / `buffer.kMaxLength`.
- `chown` now uses the same Windows/MSYS/Cygwin detection as `SymbolicLinkEntry`.
