import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {transform} from 'esbuild';
import {gridBlurPlane} from '../source/blur-plane.js';
import {prepareRibbonSource} from '../source/ribbon-stretch.js';

const actionSource=await fs.readFile(new URL('../source/clean-effect.ts',import.meta.url),'utf8');
const actionModule=await transform(actionSource,{loader:'ts',format:'esm',target:'es2022'});
const {preparePixels,prepare}=await import('data:text/javascript;base64,'+Buffer.from(actionModule.code).toString('base64'));
const runtime=await fs.readFile(new URL('../assets/index-BwYdjEfo.js',import.meta.url),'utf8');
const blurContext={Uint8ClampedArray,Float32Array};
vm.createContext(blurContext);
vm.runInContext(runtime.slice(runtime.indexOf('function qf('),runtime.indexOf('function hb(')),blurContext);

for(const [width,height] of [[1,1],[1,19],[23,1],[7,11],[32,27]]){
  const input=Uint8ClampedArray.from({length:width*height},(_,p)=>(p*79+p*p*11)%256);
  const saved=input.slice();
  for(const radius of [0,-1,.01,.2,1,2.7,12,42]){
    const actual=gridBlurPlane(input,width,height,radius);
    assert.deepEqual(actual,blurContext.qf(input,width,height,radius),`exact blur: ${width}x${height}, r=${radius}`);
    assert.notEqual(actual,input,'blur does not transfer ownership of its input');
  }
  assert.deepEqual(input,saved,'blur input is immutable');
}
assert.throws(()=>gridBlurPlane(new Uint8ClampedArray(3),2,2,1),/Invalid alpha plane/);
assert.throws(()=>gridBlurPlane(new Uint8ClampedArray(0),0,0,1),/Invalid alpha plane/);

function pixels(width,height){
  const data=new Uint8ClampedArray(width*height*4);
  for(let p=0;p<width*height;p++){
    const x=p%width,y=Math.floor(p/width),i=p*4;
    data[i]=(x*17+y*31)%256;data[i+1]=(x*x+y*9)%256;data[i+2]=(x*11+y*y)%256;
    data[i+3]=(x+y)%7?255:(x*23+y*19)%256;
  }
  return data;
}
// SHA-256 values captured from the unmodified pre-worker Action renderer.
// Include actual preview dimensions, non-square sources, transparency, every
// Action parameter, colour grading, and extremes without needing a DOM.
const references=[
  [64,48,24,1,1,'#FFFFFF','#07080B',80,16,64,48,16,'fbf9a2d66a5d82c699a8e34dd1db396e7e52e1b0e8155d7df367d0694a63f488'],
  [48,64,60,1.4,.8,'#34A4FA','#182033',100,40,90,160,70,'d9ac9a7ccc6c567072dea951bb9651d9261958a9b974a3eefe61dae9e2f29284'],
  [72,64,96,.5,1.5,'#FF6E14','#07080B',25,0,100,60,0,'4e77761ef5808cc98e0eb6c8c729c6589fa1af8c8a0b05997ffcde225c7f7312'],
  [40,56,0,2,1,'#FFFFFF','#020305',0,40,10,25,100,'5dfa6cac6e6b2f1ec7b3b06571f26aa0c9ab5f7f9f0b1dd8cd38df807e7724c6'],
  [11,9,14,0,1,'#FFFFFF','#07080B',80,16,11,9,16,'f091785a16fb618d0a6f2e68e887b4f6c5a8e6148fd3ed8b7f3045c6348c32e0'],
  [600,600,24,1,1,'#FFFFFF','#07080B',80,16,754,754,16,'4f07b4d672f16599620a27e86178aa3f18dc5f0473688ff6aca477162c7949b6'],
];
for(const [w,h,radius,contrast,gamma,accent,ink,intensity,trail,sw,sh,clarity,hash] of references){
  const input=pixels(w,h),saved=input.slice();
  const output=preparePixels(input,w,h,radius,contrast,gamma,gridBlurPlane,accent,ink,intensity,trail,sw,sh,clarity);
  assert.equal(crypto.createHash('sha256').update(output).digest('hex'),hash,`Action remains byte-identical at ${w}x${h}`);
  assert.deepEqual(input,saved,'Action input is immutable');
  assert.equal(output.length,w*h*4);
}

const previousDocument=globalThis.document,previousImageData=globalThis.ImageData;
const canvases=[];
globalThis.ImageData=class {constructor(data,width,height){this.data=data;this.width=width;this.height=height}};
globalThis.document={createElement(type){
  assert.equal(type,'canvas');
  const canvas={calls:[]};
  const context={
    save(){canvas.calls.push(['save'])},restore(){canvas.calls.push(['restore'])},
    translate(...args){canvas.calls.push(['translate',...args])},scale(...args){canvas.calls.push(['scale',...args])},
    fillRect(...args){canvas.calls.push(['fillRect',...args])},drawImage(...args){canvas.calls.push(['drawImage',...args])},
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4).fill(90)}},
    putImageData(frame){canvas.pixels=frame.data.slice()},
  };
  canvas.getContext=()=>context;canvases.push(canvas);return canvas;
}};
try{
  const input=pixels(21,17);
  const raw=preparePixels(input,21,17,24,1,1,gridBlurPlane);
  const wrapped=prepare(input,21,17,24,1,1,gridBlurPlane).image;
  assert.deepEqual(wrapped.pixels,raw,'synchronous fallback uses the same finished Action pixels');
  assert.equal(wrapped.width,21);assert.equal(wrapped.height,17);

  const source={naturalWidth:8,naturalHeight:4},mask=Uint8ClampedArray.from({length:120},(_,i)=>i);
  const prepared=prepareRibbonSource(pixels(12,10),12,10,mask,source,125,150);
  assert.equal(prepared.width,24);assert.equal(prepared.height,20);
  assert.equal(prepared.rgba[0],135,'ribbon source brightness is retained');
  assert.equal(prepared.rgba[3],90,'brightness preserves source alpha');
  for(let y=0;y<20;y++)for(let x=0;x<24;x++)assert.equal(prepared.mask[y*24+x],mask[Math.floor(y/2)*12+Math.floor(x/2)],'2x mask sampling is exact');
  const sample=canvases.at(-1);
  assert.deepEqual(sample.calls,[['fillRect',0,0,24,20],['save'],['translate',12,10],['scale',1.25,1.25],['translate',-12,-10],['drawImage',source,-8,0,40,20],['restore']],'ribbon upload sampling preserves cover crop and zoom transforms');
  const video=prepareRibbonSource(input,21,17,null,{tagName:'VIDEO',naturalWidth:8,naturalHeight:4},100,100);
  assert.equal(video.width,21);assert.equal(video.height,17,'video keeps its original working resolution');
  assert.equal(video.mask.some(Boolean),false);
}finally{
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  if(previousImageData===undefined)delete globalThis.ImageData;else globalThis.ImageData=previousImageData;
}
console.log('Worker pixels: exact legacy blur, six Action reference frames, immutable input, identical synchronous fallback, original ribbon sampling/brightness/mask passed.');
