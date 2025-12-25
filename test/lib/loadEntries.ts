import { FileEntry as BaseFileEntry, DirectoryEntry, LinkEntry, SymbolicLinkEntry } from 'extract-base-iterator';
import fs from 'fs';
import path from 'path';
import { arrayFind } from './compat.ts';

class FileEntry extends BaseFileEntry {
  contents: string;

  constructor(attributes, contents: string) {
    super(attributes);
    this.contents = contents;
  }

  _writeFile(fullPath, _options, callback) {
    fs.writeFile(fullPath, this.contents, callback);
  }
}

import { CONTENTS } from './constants.ts';

const STRUCTURE = {
  'data/fixture.js': CONTENTS,
  'data/symlink1': '~data/fixture.js',
  'data/link1': ':data/fixture.js',
  'data/dir1/fixture.js': CONTENTS,
  'data/symlink2': '~data/dir1/fixture.js',
  'data/link2': ':data/dir1/fixture.js',
  'data/dir1/symlink1': '~data/dir1/fixture.js',
  'data/dir1/link1': ':data/dir1/fixture.js',
  'data/dir1/dir2/symlink1': '~data/dir1/fixture.js',
  'data/dir1/dir2/link1': ':data/dir1/fixture.js',
  'data/dir3/symlink1': '~data/dir1/fixture.js',
  'data/dir3/link1': ':data/dir1/fixture.js',
};
const DMODE = 0o755;
const FMODE = 0o644;
const SMODE = 0o755;
const LMODE = 0o644;

function addDirectories(relativePath, entries) {
  const parts = relativePath.split('/');
  for (let index = 0; index < parts.length - 1; index++) {
    const directoryPath = parts.slice(0, index + 1).join('/');

    if (!arrayFind(entries, (entry) => entry instanceof DirectoryEntry && entry.path === directoryPath)) entries.push(new DirectoryEntry({ path: directoryPath, mode: DMODE, mtime: Date.now() }));
  }
}

export default function loadEntries() {
  const entries = [];
  for (const relativePath in STRUCTURE) {
    const contents = STRUCTURE[relativePath];
    addDirectories(relativePath, entries);
    if (contents[0] === ':') entries.push(new LinkEntry({ path: relativePath, linkpath: contents.slice(1), mode: LMODE, mtime: Date.now() }));
    else if (contents[0] === '~') {
      const fullPath = relativePath.split('/').join(path.sep);
      const linkFullPath = contents.slice(1).split('/').join(path.sep);
      const linkpath = path.relative(path.dirname(fullPath), linkFullPath);
      const linkDenormalizedPath = linkpath.split(path.sep).join('/');
      entries.push(new SymbolicLinkEntry({ path: relativePath, linkpath: linkDenormalizedPath, mode: SMODE, mtime: Date.now() }));
    } else entries.push(new FileEntry({ path: relativePath, mode: FMODE, mtime: Date.now() }, contents));
  }
  return entries;
}
