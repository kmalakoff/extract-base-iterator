## extract-base-iterator

Base iterator for extract iterators like tar-iterator and zip-iterator.

// asyncIterator

```js
var assert = require('assert');
var BaseIterator = require('extract-base-iterator'));

// extend BaseIterator (see tests, tar-iterator, zip-iterator for examples)

var iterator = new YourIterator();

(async function() {
  const links = [];
  for await (const entry of iterator) {
    if (entry.type === 'symlink' || entry.type === 'link') links.push(entry);
    else await entry.create(dest, options);
  }

  // create links after directories and files
  for (const entry of links) {
    await entry.create(dest, options);
  }
})();
```

// Async / Await

```js
var assert = require('assert');
var BaseIterator = require('extract-base-iterator'));

// extend BaseIterator (see tests, tar-iterator, zip-iterator for examples)

var iterator = new YourIterator();

// one by one
(async function() {
  const links = [];
  let entry = await iterator.next();
  while (entry) {
    if (entry.type === 'symlink' || entry.type === 'link') links.push(entry);
    else await entry.create(dest, options);
    entry = await iterator.next();
  }

  // create links after directories and files
  for (entry of links) {
    await entry.create(dest, options);
  }
})();

// infinite concurrency
(async function() {
  const links = [];
  await iterator.forEach(
    async function (entry) {
      if (entry.type === 'symlink' || entry.type === 'link') links.push(entry);
      else await entry.create(dest, options);
    },
    { concurrency: Infinity }
  );

  // create links after directories and files
  for (const entry of links) {
    await entry.create(dest, options);
  }
})();
```

// Callbacks

```js
var assert = require('assert');
var Queue = require('queue-cb');
var BaseIterator = require('extract-base-iterator'));

// extend BaseIterator (see tests, tar-iterator, zip-iterator for examples)

var iterator = new YourIterator();

// one by one
var links = [];
iterator.forEach(
  function (entry, callback) {
    if (entry.type === 'symlink' || entry.type === 'link') {
      links.push(entry);
      callback();
    } else entry.create(dest, options, callback);
  },
  { callbacks: true, concurrency: 1 },
  function (err) {
    if (err) return callback(err);

    // create links after directories and files
    var queue = new Queue();
    for (var index = 0; index < links.length; index++) {
      var entry = links[index];
      queue.defer(entry.create.bind(entry, dest, options));
    }
    queue.await(callback);
  }
);
```
