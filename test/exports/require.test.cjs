const assert = require('assert');
const BaseIterator = require('extract-base-iterator');

describe('exports .cjs', () => {
  it('signature', () => {
    assert.ok(BaseIterator);
    assert.ok(BaseIterator.DirectoryEntry);
    assert.ok(BaseIterator.FileEntry);
    assert.ok(BaseIterator.LinkEntry);
    assert.ok(BaseIterator.SymbolicLinkEntry);
  });
});
