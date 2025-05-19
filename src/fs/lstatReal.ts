import fs from 'graceful-fs';

export default function lstatReal(path, callback) {
  fs.realpath(path, function realpathCallback(err, realpath) {
    err ? callback(err) : fs.lstat(realpath, callback);
  });
}
