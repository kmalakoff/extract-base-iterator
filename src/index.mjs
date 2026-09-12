import StackBaseIterator from 'stack-base-iterator';
import DirectoryEntry from './DirectoryEntry.cjs';
import FileEntry from './FileEntry.cjs';
import LinkEntry from './LinkEntry.cjs';
import SymbolicLinkEntry from './SymbolicLinkEntry.cjs';

StackBaseIterator.DirectoryEntry = DirectoryEntry;
StackBaseIterator.FileEntry = FileEntry;
StackBaseIterator.LinkEntry = LinkEntry;
StackBaseIterator.SymbolicLinkEntry = SymbolicLinkEntry;
export default StackBaseIterator;
