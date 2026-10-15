import assert from 'node:assert/strict';
import { createGridRenderCache } from '../source/render-cache.js';

const cache = createGridRenderCache();
let computed = 0;
const compute = () => ({ generation: ++computed });
let media = { currentTime: 0 };
let renderSize = 600, scale = 100, brightness = 100, contrast = 100;
let mask = new Uint8ClampedArray(4);
const frameKey = () => [media, media.currentTime, renderSize, scale, brightness, contrast, mask];
const initial = cache.get('image', frameKey(), compute);
assert.equal(cache.get('image', frameKey(), compute), initial, 'equal key values reuse the exact result');
assert.equal(computed, 1);

for (const change of [
  () => { media = { currentTime: 0 }; },
  () => { media.currentTime = 1 / 30; },
  () => { renderSize = 300; },
  () => { scale = 125; },
  () => { brightness = 110; },
  () => { contrast = 125; },
  () => { mask = new Uint8ClampedArray(4); }
]) {
  const before = computed;
  change();
  const result = cache.get('image', frameKey(), compute);
  assert.equal(computed, before + 1, 'media identity, frame, quality, parameter or mask change invalidates the stage');
  assert.equal(cache.get('image', frameKey(), compute), result);
  assert.equal(computed, before + 1);
}

const currentImage = cache.get('image', frameKey(), compute);
const action = cache.get('action', [currentImage, 24, 80, 16], compute);
cache.get('dot-prepared', [currentImage, 12], compute);
assert.equal(cache.get('action', [currentImage, 24, 80, 16], compute), action, 'other stages do not evict Action');
assert.equal(cache.get('image', frameKey(), compute), currentImage, 'other stages do not evict the source image');
const beforeEviction = computed;
cache.get('action', [currentImage, 25, 80, 16], compute);
cache.get('action', [currentImage, 24, 80, 16], compute);
assert.equal(computed, beforeEviction + 2, 'each stage stores only its latest entry');

let key = [1];
const snapshot = cache.get('snapshot', key, compute);
key[0] = 2;
assert.equal(cache.get('snapshot', [1], compute), snapshot, 'mutating the caller key cannot alter the stored snapshot');
const nan = cache.get('exact', [NaN, 0], compute);
assert.equal(cache.get('exact', [NaN, 0], compute), nan, 'NaN matches using Object.is');
assert.notEqual(cache.get('exact', [NaN, -0], compute), nan, 'negative zero differs using Object.is');
assert.notEqual(cache.get('exact', [NaN, -0, undefined], compute), cache.get('exact', [NaN, -0], compute), 'key length participates in equality');

const successful = cache.get('errors', ['ok'], compute);
let failures = 0;
for (let attempt = 0; attempt < 2; attempt++) {
  assert.throws(() => cache.get('errors', ['bad'], () => { failures++; throw Error('render failed'); }), /render failed/);
}
assert.equal(failures, 2, 'failures are retried instead of cached');
assert.equal(cache.get('errors', ['ok'], compute), successful, 'failure preserves the previous successful result');
let emptyCalls = 0;
assert.equal(cache.get('empty', [], () => { emptyCalls++; }), undefined);
assert.equal(cache.get('empty', [], () => { emptyCalls++; }), undefined);
assert.equal(emptyCalls, 1, 'undefined is a cacheable successful result');

cache.clear('image');
assert.notEqual(cache.get('image', frameKey(), compute), currentImage, 'one stage can be explicitly invalidated');
assert.equal(cache.get('errors', ['ok'], compute), successful, 'targeted invalidation preserves other stages');
cache.clear();
assert.notEqual(cache.get('errors', ['ok'], compute), successful, 'clear invalidates every stage');
console.log('Render cache: frame/quality/parameter/mask invalidation, independent bounded stages, exact keys and failed-render recovery passed.');
