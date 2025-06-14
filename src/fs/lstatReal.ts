import fs, { type Stats, type BigIntStats } from 'fs';

export type Callback = (err: NodeJS.ErrnoException | null, stats?: Stats | BigIntStats) => void;

export default function lstatReal(path: string, callback: Callback): undefined {
  fs.realpath(path, (err, realpath) => {
    err ? callback(err) : fs.lstat(realpath, callback);
  });
}
