# extract-base-iterator

Base classes and filesystem helpers for archive iterators such as `tar-iterator` and `zip-iterator`. It is intended for authors of extract iterators, not as a standalone archive extractor.

## Install

```sh
npm install extract-base-iterator
```

## Extend the base iterator

```js
const ExtractBaseIterator = require('extract-base-iterator');

class ArchiveIterator extends ExtractBaseIterator {
  // Implement the archive parser and push Entry objects into this iterator.
}
```

The package exports `ExtractBaseIterator` as the default export, plus `FileEntry`, `DirectoryEntry`, `LinkEntry`, `SymbolicLinkEntry`, path-safety helpers, and shared types. Entry `create(destination, options)` methods accept `strip` to remove leading path components and `force` to allow overwriting an existing destination. See `tar-iterator` or `zip-iterator` for complete parser implementations.

## Documentation

See the [source and tests](https://github.com/kmalakoff/extract-base-iterator) for concrete iterator implementations.
