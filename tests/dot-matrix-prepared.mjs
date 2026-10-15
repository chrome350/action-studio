import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareDotMatrixSource,renderDotMatrix} from '../source/dot-matrix.js';

// Record the complete sequence of canvas operations. Geometry, colours and
// ordering must match the original renderer, including animated gradients.
function canvasDocument(){
 return {createElement(){
  const operations=[];
  const ctx={fillRect(...args){operations.push(['rect',this.fillStyle,...args])},beginPath(){operations.push(['begin'])},arc(...args){operations.push(['arc',...args])},fill(){operations.push(['fill',this.fillStyle])}};
  return {operations,getContext(){return ctx}};
 }};
}
globalThis.document=canvasDocument();
const width=47,height=39,data=new Uint8ClampedArray(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const i=(y*width+x)*4;
 data[i]=(x*29+y*17)%256;data[i+1]=(x*7+y*37)%256;data[i+2]=(x*43+y*11)%256;data[i+3]=(x+y)%9===0?0:255;
}
const colors=['#FF6E14','#FFFFFF','#34A4FA','#3E6BFF'];
const cases=[
 [6,1,null,colors,null],
 [4,.55,null,colors,0],
 [7.5,1.7,{black:.025,white:.8},colors,.271],
 [12,.9,null,['#FFFFFF'],null],
 [5.25,1.2,{black:0,white:.5},null,.99]
];
const digest=canvas=>createHash('sha256').update(JSON.stringify({operations:canvas.operations,profile:canvas.dotMatrixProfile})).digest('hex');
const source=prepareDotMatrixSource(data,width,height);
const hashes=[];
for(const args of cases){
 const uncached=renderDotMatrix(data,width,height,...args);
 const cached=renderDotMatrix(data,width,height,...args,source);
 assert.equal(digest(cached),digest(uncached),'Prepared source must preserve every drawing operation');
 hashes.push(digest(cached));
}

// These hashes were captured from the original renderer before this refactor.
const expected=[
 'cf9113024255b5dc849f795a131d52c9c107a68cac26c25558b58daf3a31f36a',
 '6289a679ff25a7697627384051478d412a9472acff54beb4916f709017071f2a',
 '550c243801fc9a6387a32d438e27b039fb3bc4f309132745e57ad907375e1d56',
 '9eeaf716d3170dc52f6f2aedf1bc87652b3bffb44b17830dced89fa3e67c4b18',
 '9aa4ab30203e6c6acbc11c5f1a16b00034597c77e04b6039cc1b237b0a4ca1c0'
];
assert.deepEqual(hashes,expected,'Stable baseline geometry, colour and draw order');

const first=renderDotMatrix(data,width,height,6,1,null,colors,null,source);
const firstHash=digest(first),analysis=source.analysis,geometry=source.geometry;
const recolored=renderDotMatrix(data,width,height,6,1,null,['#B40100','#70120B'],.4,source);
assert.equal(source.analysis,analysis,'Palette and phase reuse source analysis');
assert.equal(source.geometry,geometry,'Palette and phase reuse dot geometry');
assert.notEqual(recolored,first,'Each result owns its canvas');
recolored.repaintGradient(.7);
assert.equal(digest(first),firstHash,'A newer frame never repaints an older canvas');

renderDotMatrix(data,width,height,6,.8,null,colors,null,source);
assert.equal(source.analysis,analysis,'Contrast reuses source analysis');
assert.notEqual(source.geometry,geometry,'Contrast updates radii');
const profile={black:.02,white:.9};
renderDotMatrix(data,width,height,6,1,profile,colors,null,source);
const profiled=source.geometry;
profile.white=.4;
assert.equal(digest(renderDotMatrix(data,width,height,6,1,profile,colors,null,source)),digest(renderDotMatrix(data,width,height,6,1,profile,colors,null)),'Mutable profile values invalidate the geometry cache');
assert.notEqual(source.geometry,profiled);
const other=new Uint8ClampedArray(data);other.fill(0);
assert.equal(digest(renderDotMatrix(other,width,height,6,1,null,colors,null,source)),digest(renderDotMatrix(other,width,height,6,1,null,colors,null)),'A prepared object for a different pixel array is not reused');
data.fill(0);
assert.equal(renderDotMatrix(data,width,height,6,1).dotMatrixProfile.white,.018+.18,'Unprepared mutable data is always reanalysed');
console.log('Dot preparation: exact baseline operations, cache reuse/invalidation, profile snapshots and independent canvases passed.');
