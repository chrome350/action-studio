import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {ribbonPixels} from '../source/ribbon-stretch.js';
// Golden pixel hashes from the pre-optimization renderer, with deterministic
// translucent, gradient and dark inputs, disconnected and slanted selections.
let seed=771;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const cases=[];
for(let k=0;k<40;k++){
 const w=64+k%7,h=53+k%11,d=new Uint8ClampedArray(w*h*4),m=new Uint8ClampedArray(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,object=x>w*.2&&x<w*.8&&y>h*.12&&y<h*.88;
  const v=k%3===0?220+y/4:0;
  d.set(object?[100+random()*155,random()*180,80+random()*150,k%4===0?random()*255:255]:[v,v,v,255],p*4);
  if((Math.abs(x-(w*.26+y*.12))<4&&y>h*.2&&y<h*.7)||(k%2&&x>w*.67&&x<w*.78&&y>h*.45&&y<h*.85))m[p]=k%5?255:Math.floor(random()*255);
 }
 cases.push([d,w,h,[0,10,85,100][k%4],[1,24,40][k%3],[0,45,100,150,-10][k%5],['auto','left','right'][k%3],m]);
}
const renderer=process.env.RIBBON_BASELINE?(await import(process.env.RIBBON_BASELINE)).ribbonPixels:ribbonPixels;
const hashes=cases.map(args=>createHash('sha256').update(renderer(...args)).digest('hex'));
if(process.env.RIBBON_BASELINE)console.log(JSON.stringify(hashes,null,2));
else{assert.deepEqual(hashes,JSON.parse(readFileSync(new URL('./fixtures/ribbon-exact.json',import.meta.url))));console.log('Passed: 40 exact pixel regressions, including out-of-range bend fallback.');}
