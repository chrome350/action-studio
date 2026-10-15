import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {ribbonPixels} from '../source/ribbon-stretch.js';
const w=120,h=80,data=new Uint8ClampedArray(w*h*4),left=new Uint8ClampedArray(w*h),right=new Uint8ClampedArray(w*h);
for(let p=0;p<w*h;p++)data[p*4+3]=255;
for(let y=20;y<60;y++)for(let x=30;x<90;x++)data.set([180+x%30,40+y,80,255],(y*w+x)*4);
for(let y=28;y<50;y++)for(let x=28;x<40;x++){left[y*w+x]=255;right[y*w+w-1-x]=255;}
for(const [mask,direction] of [[left,'left'],[right,'right']]) {
  assert.deepEqual(ribbonPixels(data,w,h,60,20,25,'auto',mask),ribbonPixels(data,w,h,60,20,25,direction,mask),'auto matches nearest edge');
  assert.deepEqual(ribbonPixels(data,w,h,60,20,25,undefined,mask),ribbonPixels(data,w,h,60,20,25,direction,mask),'default is auto');
}
const both=left.map((v,p)=>Math.max(v,right[p]));
const out=ribbonPixels(data,w,h,60,20,25,'auto',both);
const l=ribbonPixels(data,w,h,60,20,25,'left',left),r=ribbonPixels(data,w,h,60,20,25,'right',right);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;assert.deepEqual(out.slice(i,i+4),(x<w/2?l:r).slice(i,i+4),'separate patches extend independently');}
for(const file of ['assets/index-BwYdjEfo.js','Grid Studio.html']) {
  const source=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');
  assert.ok(source.includes('[ribbonDirection,setRibbonDirection]=O.useState("auto")'));
  assert.ok(source.includes('setRibbonDirection("auto")'));
  assert.ok(!source.includes('aria-label":"Направление лент'));
}
console.log('Passed: automatic default, nearest edge, independent patches, manual directions, reset and both builds.');
