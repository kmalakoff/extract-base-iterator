export = FileEntry;
declare function FileEntry(attributes: any): void;
declare class FileEntry {
    constructor(attributes: any);
    basename: string;
    type: string;
    create(dest: any, options: any, callback: any): any;
    destroy(): void;
}
