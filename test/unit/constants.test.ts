import assert from 'assert';
import { isWindows } from '../../src/constants.ts';

describe('constants', () => {
  describe('isWindows', () => {
    it('should be a boolean matching platform and OSTYPE', () => {
      assert.strictEqual(typeof isWindows, 'boolean');
      const expected = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE || '');
      assert.strictEqual(isWindows, expected);
    });
  });
});
