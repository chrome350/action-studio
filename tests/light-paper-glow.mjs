import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {gridRemovePaperGlow} from '../source/adaptive-tone.js';
import {gridBlurPlane} from '../source/blur-plane.js';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require(process.env.GRID_CANVAS_PATH||'@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.ImageData=ImageData;
const module=await build({entryPoints:[new URL('../source/clean-effect.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {prepare,draw}=await import('data:text/javascript;base64,'+Buffer.from(module.outputFiles[0].text).toString('base64'));
const size=120;
for(const color of [[255,255,255],[220,220,220],[218,235,242],[248,231,217],[239,224,245],[204,239,220]]){
 const paper=new Uint8ClampedArray(size*size*4);for(let i=0;i<paper.length;i+=4)paper.set([...color,255],i);
 const glow=prepare(paper,size,size,24,1,1,gridBlurPlane,'#FFFFFF','#07080B',80,16,size,size,16);
 const render=time=>{const canvas=createCanvas(size,size),context=canvas.getContext('2d');draw(context,glow,time,80,16);return context.getImageData(0,0,size,size).data;};
 for(const time of [null,0,2.5,7]){
  const frame=render(time),reference=render(time);
  gridRemovePaperGlow(frame,reference,paper);
  assert.deepEqual(frame,paper,`${color}: empty paper stays exact at every pixel, time ${time}`);
 }
 const frame=render(null),reference=frame.slice(),offset=(60*size+60)*4;
 frame[offset]=Math.max(0,frame[offset]-40);const delta=frame[offset]-reference[offset];
 gridRemovePaperGlow(frame,reference,paper);
 assert.equal(frame[offset],Math.max(0,Math.min(255,color[0]+delta)),'Subject colour difference is retained');
}
console.log('Real Canvas: white, grey and four pastel backdrops remain exact with static and animated Action; subject colour delta retained.');
