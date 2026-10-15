import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resetRibbonMask} from '../source/ribbon-mask.js';

const empty=new Uint8ClampedArray(360000);
assert.equal(resetRibbonMask(empty),empty,'empty mask retains state identity');
const painted=new Uint8ClampedArray(empty);painted[359999]=255;
const cleared=resetRibbonMask(painted);
assert.notEqual(cleared,painted,'selected mask receives a state update');
assert.equal(cleared.some(Boolean),false,'the entire selection resets');
assert.equal(painted[359999],255,'previous state remains immutable');
assert.equal(resetRibbonMask(cleared),cleared,'subsequent empty reset is a no-op');
assert.equal(resetRibbonMask(undefined).length,360000,'missing mask uses canvas dimensions');
const small=new Uint8ClampedArray(12);
assert.equal(resetRibbonMask(small,4,3),small,'custom canvas preserves empty state');
assert.equal(resetRibbonMask(small,6,3).length,18,'changed dimensions resize selection');
assert.equal(resetRibbonMask(null,4,3).length,12,'missing custom-size mask is initialized');

// Build copied artifacts: exercise the actual migration and verify repeat builds
// without changing the developer's local preview or offline HTML.
const root=new URL('../',import.meta.url);
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'grid-ribbon-mask-'));
try {
  for(const name of ['scripts/build-ribbon-stretch.mjs','source/ribbon-mask.js','source/ribbon-stretch.js','assets/index-BwYdjEfo.js','Grid Studio.html']) {
    const destination=path.join(temporary,name);
    await fs.mkdir(path.dirname(destination),{recursive:true});
    await fs.copyFile(new URL(name,root),destination);
  }
  const run=()=>promisify(execFile)(process.execPath,[path.join(temporary,'scripts/build-ribbon-stretch.mjs')]);
  await run();
  const files=['assets/index-BwYdjEfo.js','Grid Studio.html'];
  const firstBuild=await Promise.all(files.map(name=>fs.readFile(path.join(temporary,name),'utf8')));
  const hook='O.useEffect(()=>{setRibbonMask(resetRibbonMask)},[rt,x]);';
  for(const runtime of firstBuild) {
    assert.equal(runtime.split(hook).length,2,'source/scale reset hook occurs once');
    assert.equal(runtime.split('function resetRibbonMask(').length,2,'runtime includes one helper');
    assert.ok(!runtime.includes('O.useEffect(()=>{setRibbonMask(new Uint8ClampedArray(360000))},[rt,x]);'),'old allocating hook is removed');
  }
  await run();
  for(let index=0;index<files.length;index++)assert.equal(await fs.readFile(path.join(temporary,files[index]),'utf8'),firstBuild[index],'rebuilding is idempotent');

  // Run the exact emitted hook with React's Object.is state bailout semantics.
  // A scale/source update with no painted selection must cause no extra render.
  let state=empty,updates=0;
  const sandbox={rt:'source',x:1,resetRibbonMask,O:{useEffect:effect=>effect()},setRibbonMask:updater=>{
    const next=updater(state);
    if(!Object.is(state,next))updates++;
    state=next;
  }};
  vm.createContext(sandbox);
  vm.runInContext(hook,sandbox);
  assert.equal(updates,0,'empty source/scale reset does not render again');
  state=painted;
  vm.runInContext(hook,sandbox);
  assert.equal(updates,1,'painted selection resets and refreshes the canvas');
  assert.equal(state.some(Boolean),false,'runtime reset clears painted pixels');
  vm.runInContext(hook,sandbox);
  assert.equal(updates,1,'resetting the now-empty selection causes no further render');
} finally {
  const target=path.resolve(temporary);
  assert.equal(path.dirname(target),path.resolve(os.tmpdir()),'cleanup stays inside temporary directory');
  assert.match(path.basename(target),/^grid-ribbon-mask-/,'cleanup targets this test fixture');
  await fs.rm(target,{recursive:true,force:true});
}
console.log('Ribbon mask reset passed: empty-state bailout, selection reset, dimensions, runtime integration, rebuild idempotence.');
