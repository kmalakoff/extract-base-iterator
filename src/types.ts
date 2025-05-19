export type Callback = (error?: Error) => void;
export type WriteFileFn = (path: string, options: object, callback: Callback) => void;
