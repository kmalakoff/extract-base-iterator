export = LinkEntry;
declare function LinkEntry(attributes: any, _type: any): void;
declare class LinkEntry {
    constructor(attributes: any, _type: any);
    basename: string;
    type: string;
    create(dest: any, options: any, callback: any): any;
    destroy(): void;
}
