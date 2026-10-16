// Exercise the actual render effect with persistent React refs and queued frames.
// Canvas pixels are fixed here: this regression checks which expensive stages
// execute, while the effect-specific tests cover the resulting image algorithms.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createGridRenderCache, createGridRenderGate } from '../source/render-cache.js';
import { gridVideoPolicy, gridResizeMask, gridPublishVideoFrame } from '../source/video-performance.js';

const source = await fs.readFile(new URL('../source/video-render-loop.js', import.meta.url), 'utf8');
const script = new vm.Script(`(function renderComponent() {\n${source}\n})()`);
const makeMedia = (tagName = 'IMG') => ({
  tagName, complete: true, naturalWidth: 600, naturalHeight: 600,
  paused: false, currentTime: 0, gridAnimated: false, dispatchEvent() {}
});

function harness(overrides = {}) {
  const counts = { source: 0, reads: 0, tone: 0, action: 0, actionBase: 0, actionDraw: 0, letters: 0, glyphs: 0, dot: 0, dotSource: 0, gradient: 0, ribbon: 0, composite: 0 };
  let nextId = 0, now = 1000, hookIndex = 0, cleanup, previousDeps;
  const refs = [], frames = new Map(), timers = new Map(), unmountEffects = [];
  let effectIndex = 0;
  let visibleCanvas;
  function canvas() {
    const result = { width: 600, height: 600, dataset: {} };
    const pixels = (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4).fill(128) });
    const context = {
      canvas: result, clearRect() {}, fillRect() {}, save() {}, restore() {}, translate() {}, scale() {},
      beginPath() {}, moveTo() {}, arc() {}, rect() {}, fill() {}, clip() {},
      drawImage(image) {
        if (image?.tagName === 'IMG' || image?.tagName === 'VIDEO') counts.source++;
        if (result === visibleCanvas && image?.getContext) counts.composite++;
      },
      getImageData(x, y, width, height) { counts.reads++; return pixels(width, height); },
      createImageData(width, height) { return pixels(width, height); },
      putImageData() {},
      measureText() { return { width: 10 }; }
    };
    result.getContext = () => context;
    return result;
  }
  visibleCanvas = canvas();
  const sandbox = {
    console, Uint8ClampedArray, Event,
    O: {
      useRef(initial) {
        const index = hookIndex++;
        return refs[index] ||= { current: initial };
      },
      useEffect(effect) {
        const index = effectIndex++;
        if (!(index in unmountEffects)) unmountEffects[index] = effect();
      },
      useLayoutEffect(effect, deps) {
        if (previousDeps && previousDeps.length === deps.length && deps.every((value, index) => Object.is(value, previousDeps[index]))) return;
        cleanup?.();
        previousDeps = Array.from(deps);
        cleanup = effect();
      }
    },
    document: { hidden: false, createElement: canvas },
    window: { matchMedia: () => ({ matches: false }) },
    performance: { now: () => now },
    requestAnimationFrame(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    Path2D: class { rect() {} moveTo() {} arc() {} },
    ImageData: class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } },
    createGridRenderCache, createGridRenderGate, gridVideoPolicy, gridResizeMask, gridPublishVideoFrame,
    createGridEffectWorker: () => ({ available: false, status: 'disabled', run: () => Promise.resolve(null), invalidate() {}, dispose() {} }),
    gridForegroundForEffects: data => data,
    gridAdaptiveTone() { counts.tone++; return {}; },
    gb() { counts.action++; return {}; },
    yb() { counts.actionDraw++; }, hb() { counts.cellMaskBlur=(counts.cellMaskBlur||0)+1; },
    qf() {},
    GridCleanStyle: { prepareGlow() { return { image: canvas() }; }, applyBase(data) { counts.actionBase++; counts.actionBasePixel=Array.from(data.slice(0,4)); } },
    lettersColorField() { counts.letters++; return {}; },
    mb() { counts.glyphs++; },
    cacheLettersCell(state, image, x, y, size) { state.cells.push({ image, x, y, size, tiles: [{ ox: 0, oy: 0, vx: 0, vy: 0 }] }); },
    drawLettersInteraction() {},
    renderRibbonStretch() { counts.ribbon++; const image = canvas(); image.highResolution = canvas(); return image; },
    renderDotMatrix() {
      counts.dot++;
      const image = canvas();
      image.repaintGradient = () => { counts.gradient++; return image; };
      return image;
    },
    prepareDotMatrixSource(data, width, height) { counts.dotSource++; return { data, width, height }; },
    ib: () => true, db() {}, fb() {}, sb() {},
    videoTools: { isRecording: () => false },
    lettersMotion: { current: { cells: [], previousCells: [], last: 0 } },
    ribbonExportFrame: { current: null }, Be: { current: visibleCanvas },
    Ft: { current: makeMedia() }, _e: { current: false }, Xt: { current: [] }, y: { current: 0 },
    f: 3, s: 1, v: true, T: '#ffffff', b: 20, x: 100, Y: 100, W: 100,
    B: '#000000', Z: '#ffffff', j: 1, rt: 0, P: 'clean',
    J: { clean: 24, dotmatrix: 12, letters: 18, ribbons: 20, pixels: 6, dithering: 6, halftone: 6 },
    K: { 1: { mode: 'letters' }, 2: { mode: 'dotmatrix' } }, Q: 80, Lt: 16, actionClarity: 16, actionAnimate: false, actionSpeed: 100,
    dotColors: ['#fff', '#f80'], dotAnimate: false, dotPalette: 'confa',
    ribbonCapture: 40, ribbonBend: 20, ribbonDirection: 'vertical', ribbonMask: new Uint8ClampedArray(600 * 600),
    lettersPalette: 'confa', lettersColors: ['#fff'], lettersInteractive: true, lettersRadius: 50, lettersStrength: 30,
    ci: ['clean', 'letters', 'dotmatrix', 'ribbons', 'pixels', 'dithering', 'halftone'].map(mode => ({ mode })),
    ...overrides
  };
  vm.createContext(sandbox);
  const render = (changes = {}, flushInitialFrame = true) => {
    Object.assign(sandbox, changes);
    hookIndex = effectIndex = 0;
    script.runInContext(sandbox);
    if (flushInitialFrame) { tick(0); tick(0); }
  };
  const tick = (elapsed = 100) => {
    now += elapsed;
    for (const [id, timer] of Array.from(timers)) if (timer.due <= now) {
      timers.delete(id);
      timer.callback();
    }
    const pending = Array.from(frames);
    frames.clear();
    for (const [, callback] of pending) callback(now);
  };
  render();
  return { counts, state: sandbox, render, tick, dispose: () => { cleanup?.(); for (const effect of unmountEffects) effect?.(); } };
}

const stages = ['source', 'tone', 'action', 'letters', 'dot'];
const prepared = test => Object.fromEntries(stages.map(stage => [stage, test.counts[stage]]));
const ui = harness();
assert.deepEqual(prepared(ui), { source: 1, tone: 1, action: 1, letters: 1, dot: 1 }, 'first mixed frame prepares each required stage once');
for (const change of [
  { T: '#ff6600' }, { b: 55 }, { v: false },
  { lettersRadius: 75 }, { lettersStrength: 50 }, { lettersInteractive: false }, { dotAnimate: true }
]) {
  const before = prepared(ui);
  ui.render(change);
  assert.deepEqual(prepared(ui), before, `UI-only change reuses expensive stages: ${Object.keys(change)[0]}`);
}
for (const change of [{ f: 4 }, { s: 2 }]) {
  const before = prepared(ui);
  ui.render(change);
  assert.deepEqual(prepared(ui), before, `grid geometry rebuilds composition while reusing prepared stages: ${Object.keys(change)[0]}`);
}
const beforeAnimation = { ...ui.counts };
for (let frame = 0; frame < 5; frame++) ui.tick();
for (const stage of [...stages, 'glyphs', 'actionBase']) assert.equal(ui.counts[stage], beforeAnimation[stage], `${stage} is reused during Dot animation`);
assert.equal(ui.counts.gradient, beforeAnimation.gradient + 5, 'each animated Dot frame repaints its gradient');
assert.ok(ui.counts.composite > beforeAnimation.composite, 'animated Dot frames are composited');
ui.dispose();

const animated = harness({ Ft: { current: { ...makeMedia(), gridAnimated: true } }, dotAnimate: true });
const beforeAnimatedImage = prepared(animated);
for (let frame = 0; frame < 5; frame++) animated.tick();
for (const stage of stages) assert.equal(animated.counts[stage], beforeAnimatedImage[stage] + 5, `animated image refreshes ${stage} during moving mixed Dot frames`);
animated.dispose();

const stillAnimated = harness({ Ft: { current: { ...makeMedia(), gridAnimated: true } }, dotAnimate: false });
const beforeStillAnimated = prepared(stillAnimated);
for (let frame = 0; frame < 5; frame++) stillAnimated.tick();
assert.deepEqual(prepared(stillAnimated), beforeStillAnimated, 'animated image retains the existing frame between layout updates when Dot animation is disabled');
stillAnimated.render({ T: '#ff00ff' });
for (const stage of stages) assert.equal(stillAnimated.counts[stage], beforeStillAnimated[stage] + 1, `animated image rereads current pixels for ${stage} when layout changes`);
stillAnimated.dispose();

const staticImage = harness({ Ft: { current: makeMedia() }, dotAnimate: false });
const beforeStaticImage = prepared(staticImage);
for (let frame = 0; frame < 5; frame++) staticImage.tick();
staticImage.render({ T: '#ff00ff' });
assert.deepEqual(prepared(staticImage), beforeStaticImage, 'explicitly static image reuses cached stages across RAF and layout updates');
staticImage.dispose();

const inputs = harness();
for (const [name, change, sourceChanged] of [
  ['scale', { x: 125 }, true], ['brightness', { Y: 110 }, false],
  ['contrast', { W: 140 }, false],
  ['glow', { J: { ...inputs.state.J, clean: 30 } }, false],
  ['intensity', { Q: 65 }, false], ['trail', { Lt: 24 }, false], ['clarity', { actionClarity: 30 }, false]
]) {
  const before = { ...inputs.counts };
  inputs.render(change);
  assert.equal(inputs.counts.action, before.action + 1, `${name} invalidates Action`);
  assert.equal(inputs.counts.source, before.source + Number(sourceChanged), `${name} invalidates only the necessary source stage`);
  assert.equal(inputs.counts.tone, before.tone + Number(sourceChanged || name === 'brightness'), `${name} invalidates only the necessary tone stage`);
}
let before = { ...inputs.counts };
inputs.render({ J: { ...inputs.state.J, dotmatrix: 18 } });
assert.equal(inputs.counts.dot, before.dot + 1, 'Dot spacing invalidates Dot preparation');
assert.equal(inputs.counts.action, before.action, 'Dot spacing preserves prepared Action');
before = { ...inputs.counts };
inputs.state.Ft.current = makeMedia();
inputs.render({ rt: inputs.state.rt + 1 });
for (const stage of stages) assert.equal(inputs.counts[stage], before[stage] + 1, `new media invalidates ${stage}`);
inputs.dispose();

const sharedAction = harness({ P: 'clean', K: {} });
assert.equal(sharedAction.counts.reads, 5, 'composition preserves raster, cell and glow-mask readback order');
for (const change of [{ Q: 55 }, { Lt: 24 }, { actionClarity: 35 }]) {
  const before = { ...sharedAction.counts };
  sharedAction.render(change);
  assert.equal(sharedAction.counts.action, before.action + 1, 'Action parameters refresh the glow');
  assert.equal(sharedAction.counts.actionBase, before.actionBase, 'glow-only edits retain prepared base cells');
  assert.equal(sharedAction.counts.reads, before.reads, 'glow-only edits retain prepared canvas mask');
}
before = { ...sharedAction.counts };
sharedAction.render({ Y: 130 });
assert.equal(sharedAction.counts.source, before.source, 'brightness reuses the scaled source raster');
assert.equal(sharedAction.counts.reads, before.reads + 4, 'brightness recomposition reads cells and mask without rereading the source');
before = { ...sharedAction.counts };
for (let frame = 0; frame < 5; frame++) sharedAction.tick();
assert.equal(sharedAction.counts.composite, before.composite, 'prepared static Action does not redraw at 30 fps');
sharedAction.dispose();

const ribbons = harness({ P: 'ribbons', K: {} });
assert.equal(ribbons.counts.ribbon, 1, 'Ribbons prepares the first frame once');
for (const change of [
  { ribbonMask: new Uint8ClampedArray(600 * 600) },
  { ribbonCapture: 50 }, { ribbonBend: 35 }, { ribbonDirection: 'horizontal' },
  { J: { ...ribbons.state.J, ribbons: 30 } }
]) {
  const before = { ...ribbons.counts };
  ribbons.render(change);
  assert.equal(ribbons.counts.ribbon, before.ribbon + 1, `Ribbons invalidates on ${Object.keys(change)[0]}`);
  assert.equal(ribbons.counts.source, before.source, 'Ribbons controls retain the source image stage');
}
const beforeRibbonOverlay = { ...ribbons.counts };
ribbons.render({ T: '#00ff00', b: 70 });
assert.equal(ribbons.counts.ribbon, beforeRibbonOverlay.ribbon, 'grid overlay retains the prepared Ribbons frame');
ribbons.dispose();

const video = makeMedia('VIDEO');
const motion = harness({ Ft: { current: video } });
assert.equal(video.gridRenderedSize, 1080, 'playing video uses native resolution');
before = prepared(motion);
video.currentTime = 1 / 30;
motion.tick();
for (const stage of stages) assert.equal(motion.counts[stage], before[stage] + 1, `new video frame invalidates ${stage}`);
before = prepared(motion);
video.paused = true;
video.gridNeedsFullFrame = true;
motion.tick();
assert.equal(video.gridRenderedSize, 1080, 'paused video renders at full quality');
assert.equal(video.gridNeedsFullFrame, false, 'full-quality frame acknowledges the export/pause request');
for (const stage of stages) assert.equal(motion.counts[stage], before[stage], `pausing the same native frame retains ${stage}`);
before = prepared(motion);
video.currentTime = 2 / 30;
video.gridNeedsFullFrame = true;
motion.tick();
assert.equal(video.gridRenderedSize, 1080, 'paused seek retains full quality');
for (const stage of stages) assert.equal(motion.counts[stage], before[stage] + 1, `paused seek invalidates ${stage}`);
video.paused = false;
video.gridExporting = true;
video.gridNeedsFullFrame = true;
motion.tick();
assert.equal(video.gridRenderedSize, 1080, 'export retains full quality');
motion.dispose();
console.log('Render loop cache: UI/static-image reuse, animated-image refresh, five animated Dot frames, targeted effect invalidation, new sources/video frames and full-quality pause/seek/export passed.');

const deferred = harness({ P: 'clean', K: {} });
before = { ...deferred.counts };
deferred.render({ Y: 135 }, false);
assert.equal(deferred.counts.action, before.action, 'layout change returns before source/effect preparation so the input can paint');
assert.equal(deferred.state.Be.current.dataset.gridRenderPending, 'true');
deferred.tick(0);
assert.equal(deferred.counts.action, before.action, 'first animation callback yields before fallback computation');
deferred.tick(0);
assert.equal(deferred.counts.action, before.action + 1, 'unsupported worker still renders the complete synchronous fallback after the input paint');
assert.equal(deferred.state.Be.current.dataset.gridRenderPending, 'false');
deferred.dispose();

const frozen = harness({ P: 'clean', K: {}, _e: { current: true } });
before = { ...frozen.counts };
frozen.render({ Y: 145 });
assert.equal(frozen.counts.action, before.action + 1, 'editing a frozen still image prepares the updated first frame');
assert.equal(frozen.state.Be.current.dataset.gridRenderPending, 'false', 'frozen image edits complete the frame gate');
before = { ...frozen.counts };
frozen.tick();
assert.deepEqual(frozen.counts, before, 'later animation ticks preserve the frozen frame');
frozen.dispose();

const gate = createGridRenderGate();
await gate.wait();
const older = gate.begin();
let exportReady = false;
const exportWaiting = gate.wait().then(() => { exportReady = true; });
const newer = gate.begin();
await Promise.resolve();
assert.equal(exportReady, false, 'export keeps waiting when the frame it started with is superseded');
assert.equal(older.isCurrent(), false);
assert.equal(newer.isCurrent(), true);
older.finish();
await Promise.resolve();
assert.equal(exportReady, false, 'finishing a stale frame cannot release an export waiting for the newest frame');
newer.finish(); await exportWaiting;
assert.equal(exportReady, true);
const cancelled = gate.begin(), cancellationWaiting = gate.wait();
gate.cancel(); await cancellationWaiting;
assert.equal(cancelled.settled, true, 'unmount cancellation releases frame waiters');
console.log('Render scheduling: input-paint yield, unsupported-worker fallback and export waiting for the newest complete frame passed.');

const requests = [];
const flushAsync = () => new Promise(resolve => setImmediate(resolve));
let invalidations = 0, disposals = 0;
const controlledWorker = {
  available: true, status: 'working',
  run(job) { return new Promise(resolve => { requests.push({ job, resolve }); }); },
  invalidate() { invalidations++; }, dispose() { disposals++; }
};
const workerRender = harness({ P: 'clean', K: {}, createGridEffectWorker: () => controlledWorker });
const complete = (index, durationMs) => {
  const request = requests[index], { width, height } = request.job;
  request.resolve({ generation: request.job.generation, durationMs, action: { width, height, rgba: new Uint8ClampedArray(width * height * 4) } });
};
assert.equal(requests.length, 1);
assert.equal(workerRender.counts.action, 0, 'supported worker skips synchronous Action preparation');
assert.equal(workerRender.counts.composite, 0, 'no partial frame reaches the visible canvas while the first worker frame is pending');
complete(0, 21); await flushAsync();
assert.ok(workerRender.counts.composite > 0);
assert.equal(workerRender.state.Be.current.dataset.gridWorkerFrames, '1');
assert.equal(workerRender.state.Be.current.dataset.gridWorkerDuration, '21');
before = { ...workerRender.counts };
workerRender.render({ Y: 110 });
assert.equal(workerRender.counts.composite, before.composite, 'the complete previous picture stays visible while a new frame is prepared');
workerRender.render({ Y: 120 });
assert.equal(requests.length, 3);
complete(1, 31); await flushAsync();
assert.equal(workerRender.counts.composite, before.composite, 'late completion from a superseded layout never paints');
complete(2, 42); await flushAsync();
assert.ok(workerRender.counts.composite > before.composite, 'latest completed worker frame is published');
assert.equal(workerRender.state.Be.current.dataset.gridWorkerFrames, '2', 'stale completion does not count as an accepted worker frame');
assert.equal(workerRender.state.Be.current.dataset.gridWorkerDuration, '42');
workerRender.render({ T: '#abcdef' });
assert.equal(requests.length, 3, 'grid-only changes reuse the prepared worker effect');
workerRender.render({ Y: 130 });
before = { ...workerRender.counts };
requests[3].resolve(null); await flushAsync();
assert.equal(workerRender.counts.action, before.action + 1, 'failed worker request calculates the identical synchronous fallback');
assert.equal(workerRender.state.Be.current.dataset.gridRenderPending, 'false');
workerRender.render({ Y: 140 });
before = { ...workerRender.counts };
workerRender.dispose();
complete(4, 70); await flushAsync();
assert.equal(workerRender.counts.composite, before.composite, 'worker result after unmount cannot publish');
assert.ok(invalidations >= 4, 'layout replacements invalidate old requests');
assert.equal(disposals, 1, 'unmount disposes the persistent worker once');
console.log('Async render integration: worker-only Action preparation, previous picture retention, stale ordering, cache reuse, failure fallback and unmount cancellation passed.');

const glowMotion = harness({ P: 'clean', K: {}, actionAnimate: true, actionSpeed: 100 });
const glowPrepared = prepared(glowMotion), glowDraws = glowMotion.counts.actionDraw;
const glowTime = glowMotion.state.y.current;
for (let frame = 0; frame < 5; frame++) glowMotion.tick();
assert.deepEqual(prepared(glowMotion), glowPrepared, 'Action animation reuses prepared effect and source');
assert.equal(glowMotion.counts.actionDraw, glowDraws + 5, 'cached Action frames keep repainting');
assert.ok(glowMotion.state.y.current > glowTime, 'Action clock advances');
glowMotion.render({ actionSpeed: 200 });
const fastTime = glowMotion.state.y.current;
glowMotion.tick(100);
assert.ok(Math.abs(glowMotion.state.y.current - fastTime - .2) < 1e-9, 'speed scales the animation clock');
glowMotion.state._e.current = true;
const frozenTime = glowMotion.state.y.current, frozenDraws = glowMotion.counts.actionDraw;
glowMotion.tick();
assert.equal(glowMotion.state.y.current, frozenTime, 'still capture freezes the animation clock');
assert.equal(glowMotion.counts.actionDraw, frozenDraws, 'still capture keeps its published frame');
glowMotion.state._e.current = false;
glowMotion.render({ actionAnimate: false });
const stoppedDraws = glowMotion.counts.actionDraw;
glowMotion.tick();
assert.equal(glowMotion.counts.actionDraw, stoppedDraws, 'disabled glow does not repaint an idle Action image');
assert.deepEqual(prepared(glowMotion), glowPrepared, 'animation controls preserve expensive caches');
glowMotion.dispose();
console.log('Action animation: cached repaint, speed, still capture and disabled idle state passed.');
// Light mixed scenes use one photographic backdrop; Action still runs its
// original renderer and grades the original cell pixels, not the inferred backdrop.
const lightMixed=harness({gridForegroundForEffects(data,w,h,bounds,metadata){
 const bg=new Uint8ClampedArray(data.length),signal=new Uint8ClampedArray(data.length);
 for(let i=0;i<data.length;i+=4){bg.set([218,235,242,255],i);signal.set([120,100,80,0],i);}
 metadata.background=bg;return signal;
}});
lightMixed.render();lightMixed.tick();
assert.equal(lightMixed.counts.cellMaskBlur||0,0,"Shared light paper has no feathered rectangular cell shadows");
assert.equal(lightMixed.counts.action,2,"Subject and shared paper each prepare Action once");
assert.ok(lightMixed.counts.actionBase>0,'light Action retains original base grading');
assert.ok(lightMixed.counts.action>0,'original Action renderer remains in use');
assert.deepEqual(lightMixed.counts.actionBasePixel,[128,128,128,128],'Action grades original pixels, never the inferred pastel backdrop');
lightMixed.render({Y:50});lightMixed.tick();
assert.deepEqual(lightMixed.counts.actionBasePixel,[64,64,64,128],'light Action applies brightness exactly once');
lightMixed.dispose();

const darkCells=harness();
assert.ok(darkCells.counts.cellMaskBlur>0,'Dark composition retains main cell masks');
darkCells.dispose();
