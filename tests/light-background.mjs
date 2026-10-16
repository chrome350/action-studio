import assert from 'node:assert/strict';
import {gridForegroundForEffects,gridAdaptiveTone,gridLettersMask} from '../source/adaptive-tone.js';
import {lettersColorField} from '../source/letters-color.js';
import {prepareDotMatrixSource} from '../source/dot-matrix.js';
const w=80,h=64;
function scene(bg,fg,gradient=false){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const color=x>=24&&x<56&&y>=16&&y<48?fg:bg.map(v=>Math.max(0,v-(gradient?y*.35:0)));
  data.set([...color,255],(y*w+x)*4);
 }
 return data;
}
for(const bg of [[255,255,255],[239,224,245],[204,239,220]]){
 for(const fg of [[0,0,0],[140,25,50],[18,30,155]]){
  const input=scene(bg,fg,true),saved=input.slice(),output=gridForegroundForEffects(input,w,h);
  assert.notEqual(output,input,'light backgrounds use foreground adaptation');
  assert.deepEqual(input,saved,'original source stays untouched');
  assert.equal(Math.max(...output.slice(0,3)),0,'light surrounding area produces no signal');
  const center=(32*w+40)*4;
  assert.ok(Math.max(...output.slice(center,center+3))>90,'dark/coloured detail stays visible');
  const profile=gridAdaptiveTone(output),mask=gridLettersMask(output,profile);
  assert.equal(mask[3],0,'Letters exclude the light backdrop');
  assert.ok(mask[center+3]>0,'Letters include the object');
  const field=lettersColorField(output,w,h,['#D02040','#D02040'],profile);
  const rgb=field(40,32,.8).match(/\d+/g).map(Number);
  assert.ok(rgb[0]>rgb[1]*3&&rgb[0]>rgb[2]*2,'chosen red letter palette is never inverted');
  const dots=prepareDotMatrixSource(output,w,h);
  assert.equal(dots.integral[10*dots.stride+10],0,'Dot Matrix has no backdrop energy');
 }
}
for(const bg of [[0,0,0],[7,8,11],[35,50,65]]){
 const input=scene(bg,[180,70,200]);
 assert.equal(gridForegroundForEffects(input,w,h),input,'dark images remain byte-identical');
}
// Non-square photo with canvas bars: use fitted bounds, not the black bars.
const fitted=new Uint8ClampedArray(w*h*4);for(let p=0;p<w*h;p++)fitted[p*4+3]=255;
for(let y=8;y<56;y++)for(let x=12;x<68;x++)fitted.set([245,245,245,255],(y*w+x)*4);
for(let y=20;y<44;y++)for(let x=30;x<50;x++)fitted.set([0,0,0,255],(y*w+x)*4);
const output=gridForegroundForEffects(fitted,w,h,{left:12,top:8,right:67,bottom:55});
assert.equal(output[(10*w+15)*4],0);assert.equal(output[(30*w+40)*4],255);assert.equal(output[0],0);
console.log('Light backgrounds: white/pastel/gradient masking, black and coloured subjects, unchanged palettes, Dot/Letters coverage, fitted bounds and exact dark-image preservation passed.');
// Pale feather detail must survive, while near-white compression noise stays absent.
const pale=scene([255,255,255],[247,247,247]);
const feather=gridForegroundForEffects(pale,w,h),center=(32*w+40)*4;
assert.ok(feather[center]>8,'low-contrast white feathers remain visible');
const featherMask=gridLettersMask(feather,gridAdaptiveTone(feather));
assert.ok(featherMask[center+3]>0,'Letters preserve white-on-white feather detail');
const noise=scene([255,255,255],[254,254,254]);
assert.equal(gridForegroundForEffects(noise,w,h)[center],0,'one-level white noise is suppressed');

// A stem touching the bottom must not become vertical background stripes.
const stem=scene([218,235,242],[120,40,60]);
for(let y=48;y<h;y++)for(let x=38;x<42;x++)stem.set([30,110,130,255],(y*w+x)*4);
const clear=gridForegroundForEffects(stem,w,h);
assert.equal(clear[(8*w+40)*4],0,'bottom stem does not contaminate background');
