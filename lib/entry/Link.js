var inherits = require('inherits');

var LinkBaseEntry = require('./BaseLink');

function LinkEntry(attributes) {
  LinkBaseEntry.call(this, attributes, 'link');
}

inherits(LinkEntry, LinkBaseEntry);

module.exports = LinkEntry;
