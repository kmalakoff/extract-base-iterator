export = SymbolicLinkEntry;
declare function SymbolicLinkEntry(attributes: any): void;
declare class SymbolicLinkEntry {
    constructor(attributes: any);
    basename: string;
    type: string;
    create(dest: any, options: any, callback: any): any;
    destroy(): void;
}
