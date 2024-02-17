export = DirectoryEntry;
declare function DirectoryEntry(attributes: any): void;
declare class DirectoryEntry {
    constructor(attributes: any);
    type: string;
    basename: string;
    create(dest: any, options: any, callback: any): any;
    destroy(): void;
}
