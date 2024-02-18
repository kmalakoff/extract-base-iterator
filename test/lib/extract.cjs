const Queue = require('queue-cb');

module.exports = function extract(iterator, dest, options, callback) {
  const links = [];
  iterator.forEach(
    (entry, callback) => {
      if (entry.type === 'link') {
        links.unshift(entry);
        callback();
      } else if (entry.type === 'symlink') {
        links.push(entry);
        callback();
      } else entry.create(dest, options, callback);
    },
    { callbacks: true, concurrency: options.concurrency },
    (err) => {
      if (err) return callback(err);

      // create links after directories and files
      const queue = new Queue(1);
      for (let index = 0; index < links.length; index++) {
        const entry = links[index];
        queue.defer(entry.create.bind(entry, dest, options));
      }
      queue.await(callback);
    }
  );
};
