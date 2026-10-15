import assert from 'node:assert/strict';
import { createGridEffectWorker } from '../source/effect-worker-client.js';

// Copy and transfer with the real structured-clone implementation. A fake that
// only saves the reference would miss accidental detachment of cache buffers.
function harness(overrides = {}) {
  const workers = [], created = [], revoked = [];
  class FakeWorker {
    constructor(url) { this.url = url; this.messages = []; this.terminated = false; workers.push(this); }
    postMessage(message, transfers) {
      this.messages.push(structuredClone(message, { transfer: transfers }));
    }
    send(message) { this.onmessage?.({ data: message }); }
    result(index = this.messages.length - 1) {
      const message = this.messages[index];
      this.send({ type: 'result', id: message.id, result: { generation: message.job.generation, pixels: message.job.rgba } });
    }
    terminate() { this.terminated = true; }
  }
  const client = createGridEffectWorker({
    Worker: FakeWorker, Blob, OffscreenCanvas: class {}, source: 'self.onmessage = () => {};',
    URL: {
      createObjectURL(blob) { const url = `blob:test-${created.length + 1}`; created.push({ blob, url }); return url; },
      revokeObjectURL(url) { revoked.push(url); }
    },
    timeoutMs: 5000,
    ...overrides
  });
  return { client, workers, created, revoked, get worker() { return workers[0]; } };
}

const job = generation => ({ generation, width: 2, height: 2, rgba: new Uint8ClampedArray(16).fill(generation), action: { radius: 24 } });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

{
  const test = harness(), request = job(1);
  assert.equal(test.client.available, true);
  assert.equal(test.client.status, 'idle');
  const pending = test.client.run(request);
  assert.equal(test.client.status, 'working');
  assert.equal(test.worker.messages.length, 1);
  assert.deepEqual(test.worker.messages[0].job.rgba, request.rgba, 'transferred worker input retains all source bytes');
  test.worker.send({ type: 'ready' });
  assert.equal(test.client.status, 'working', 'ready messages do not settle the active render');
  test.worker.result();
  assert.equal((await pending).generation, 1);
  assert.equal(test.client.status, 'idle');
  test.client.dispose();
  assert.equal(test.worker.terminated, true);
  assert.deepEqual(test.revoked, [test.created[0].url]);
}

{
  const test = harness();
  const first = test.client.run(job(1));
  const second = test.client.run(job(2));
  const latest = test.client.run(job(3));
  assert.equal(await first, null, 'superseded active caller settles immediately');
  assert.equal(await second, null, 'replaced queued caller settles without running');
  assert.equal(test.worker.messages.length, 1, 'single worker executes one calculation at a time');
  test.worker.result(0);
  assert.deepEqual(test.worker.messages.map(message => message.job.generation), [1, 3], 'only the newest queued values execute after the active calculation');
  let settled = false;
  latest.then(() => { settled = true; });
  test.worker.send({ type: 'result', id: test.worker.messages[0].id, result: { generation: 1 } });
  test.worker.send({ type: 'result', id: 9000, result: { generation: 9000 } });
  await flush();
  assert.equal(settled, false, 'late or unrelated results cannot complete the current request');
  test.worker.result(1);
  assert.equal((await latest).generation, 3);
  assert.equal(test.workers.length, 1, 'edits reuse one worker');
  test.client.dispose();
}

{
  const test = harness(), source = job(9);
  source.ribbons = {
    mask: new Uint8ClampedArray([0, 50, 100, 255]),
    highResolution: { width: 4, height: 4, rgba: new Uint8ClampedArray(64).fill(72), mask: new Uint8ClampedArray(16).fill(85) }
  };
  const originals = [source.rgba, source.ribbons.mask, source.ribbons.highResolution.rgba, source.ribbons.highResolution.mask];
  const expected = originals.map(array => array.slice());
  const pending = test.client.run(source);
  originals.forEach((array, index) => {
    assert.ok(array.byteLength > 0, 'posting a job never detaches a cached source/mask buffer');
    assert.deepEqual(array, expected[index], 'posting a job never modifies cached source/mask pixels');
  });
  const received = test.worker.messages[0].job;
  received.rgba.fill(0); received.ribbons.mask.fill(0); received.ribbons.highResolution.rgba.fill(0); received.ribbons.highResolution.mask.fill(0);
  originals.forEach((array, index) => assert.deepEqual(array, expected[index], 'worker-owned pixels are independent of cached input'));
  test.worker.result(); await pending;
  test.client.dispose();
}

{
  const test = harness();
  const active = test.client.run(job(1)), waiting = test.client.run(job(2));
  test.client.invalidate();
  assert.equal(await active, null);
  assert.equal(await waiting, null);
  const next = test.client.run(job(3));
  test.worker.result(0);
  assert.deepEqual(test.worker.messages.map(message => message.job.generation), [1, 3], 'invalidation removes the queued frame and allows a new generation');
  test.worker.result(1);
  assert.equal((await next).generation, 3);
  assert.equal(test.client.available, true, 'normal invalidation does not disable background rendering');
  test.client.dispose();
}

for (const failure of ['error', 'messageerror', 'worker-error']) {
  const test = harness();
  const active = test.client.run(job(1)), waiting = test.client.run(job(2));
  if (failure === 'error') test.worker.send({ type: 'error', id: test.worker.messages[0].id, message: 'Rendering failed' });
  if (failure === 'messageerror') test.worker.onmessageerror(new Event('messageerror'));
  if (failure === 'worker-error') {
    const event = new Event('error', { cancelable: true }); test.worker.onerror(event);
    assert.equal(event.defaultPrevented, true, 'handled worker failure does not surface as an unhandled page error');
  }
  assert.deepEqual(await Promise.all([active, waiting]), [null, null], `${failure} settles both callers for synchronous fallback`);
  assert.equal(test.client.available, false);
  assert.equal(test.client.status, 'disabled');
  assert.equal(await test.client.run(job(3)), null, 'future calls immediately request synchronous fallback');
  assert.equal(test.worker.terminated, true);
  assert.equal(test.revoked.length, 1);
  test.client.dispose();
  assert.equal(test.revoked.length, 1, 'failure and disposal release resources once');
}

{
  const test = harness(), active = test.client.run(job(1)), waiting = test.client.run(job(2));
  const lateMessage = test.worker.onmessage;
  test.client.dispose(); test.client.dispose();
  assert.deepEqual(await Promise.all([active, waiting]), [null, null], 'unmount settles all outstanding callers');
  assert.equal(test.client.status, 'disposed');
  assert.equal(test.client.available, false);
  assert.equal(test.worker.onmessage, null);
  assert.equal(test.worker.onerror, null);
  assert.equal(test.worker.onmessageerror, null);
  assert.equal(test.revoked.length, 1);
  lateMessage({ data: { type: 'result', id: 1, result: { generation: 1 } } });
  assert.equal(test.worker.messages.length, 1, 'late result cannot restart queued work after disposal');
  assert.equal(await test.client.run(job(3)), null);
}

{
  const test = harness({ timeoutMs: 8 }), active = test.client.run(job(1)), waiting = test.client.run(job(2));
  assert.deepEqual(await Promise.all([active, waiting]), [null, null], 'hung workers time out and settle all requests');
  assert.equal(test.client.status, 'disabled');
  assert.equal(test.worker.terminated, true);
  assert.equal(test.revoked.length, 1);
  test.client.dispose();
}

{
  const test = harness({ Worker: class { constructor() { throw new Error('Blocked worker'); } } });
  assert.equal(await test.client.run(job(1)), null, 'worker construction failure selects synchronous fallback');
  assert.equal(test.client.status, 'disabled');
  assert.equal(test.revoked.length, 1, 'failed construction releases its Blob URL');
  test.client.dispose();
  const unsupported = createGridEffectWorker({ source: 'noop', OffscreenCanvas: undefined });
  assert.equal(unsupported.available, false, 'unsupported browsers select synchronous fallback without throwing');
  assert.equal(await unsupported.run(job(1)), null); unsupported.dispose();
}

console.log('Effect worker client: single-flight latest-value queue, stale results, invalidation, input buffer ownership, failure/timeout fallback and disposal cleanup passed.');
