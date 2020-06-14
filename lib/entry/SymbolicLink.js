var inherits = require('inherits');

var LinkBaseEntry = require('./BaseLink');

function SymbolicLink(attributes) {
  LinkBaseEntry.call(this, attributes, 'symlink');
}

inherits(SymbolicLink, LinkBaseEntry);

module.exports = SymbolicLink;
