import assert from 'assert';
import { bufferFrom, EntryStream } from 'extract-base-iterator';

describe('EntryStream', () => {
  it('should emit data when resumed', (done) => {
    const stream = new EntryStream();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      assert.strictEqual(chunks.length, 2);
      assert.strictEqual(chunks[0].toString(), 'hello');
      assert.strictEqual(chunks[1].toString(), 'world');
      done();
    });

    stream.push(bufferFrom('hello'));
    stream.push(bufferFrom('world'));
    stream.end();
    stream.resume();
  });

  it('should buffer data when paused', (done) => {
    const stream = new EntryStream();
    const chunks: Buffer[] = [];

    stream.push(bufferFrom('hello'));
    stream.push(bufferFrom('world'));

    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      assert.strictEqual(chunks.length, 2);
      done();
    });

    // Data should be buffered until resume
    assert.strictEqual(chunks.length, 0);

    stream.end();
    stream.resume();
  });

  it('should emit end after flush when stream ended while paused', (done) => {
    const stream = new EntryStream();
    let dataReceived = false;

    stream.push(bufferFrom('data'));
    stream.end();

    stream.on('data', () => {
      dataReceived = true;
    });

    stream.on('end', () => {
      assert.strictEqual(dataReceived, true);
      done();
    });

    stream.resume();
  });

  it('should handle pause and resume', (done) => {
    const stream = new EntryStream();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => {
      chunks.push(chunk);
      stream.pause();
      // Resume after a tick
      setTimeout(() => {
        stream.resume();
      }, 0);
    });

    stream.on('end', () => {
      assert.strictEqual(chunks.length, 2);
      done();
    });

    stream.push(bufferFrom('one'));
    stream.push(bufferFrom('two'));
    stream.end();
    stream.resume();
  });

  it('should report ended state', () => {
    const stream = new EntryStream();
    assert.strictEqual(stream.ended, false);
    stream.end();
    assert.strictEqual(stream.ended, true);
  });

  it('should receive errors via emit', (done) => {
    const stream = new EntryStream();
    const testError = new Error('test error');

    stream.on('error', (err) => {
      assert.strictEqual(err, testError);
      done();
    });

    stream.emit('error', testError);
  });
});
