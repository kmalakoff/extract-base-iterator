var inherits = require('inherits');
var BaseIterator = require('../..');

function EntryIterator(entries) {
  BaseIterator.call(this);
  this.entries = entries.slice();

  var self = this;
  function next() {
    if (self.done) return;
    if (!self.entries.length) return self.end();

    // push next
    self.entries.push(self.entries.shift());
    self.stack.push(next);
    self.resume();
  }
  next();
}
inherits(EntryIterator, BaseIterator);

module.exports = EntryIterator;
