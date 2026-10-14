import assert from 'node:assert/strict';
import {renderDotMatrix} from '../source/dot-matrix.js';
let arcs=[];
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},beginPath(){},arc(...a){arcs.push(a)},fill(){}})})};
function render(pixel, size=120, profile=null){
  const data=new Uint8ClampedArray(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)data.set(pixel(x,y),4*(y*size+x));
  arcs=[];const canvas=renderDotMatrix(data,size,size,6,1,profile);
  return {arcs:arcs.map(a=>a.slice()),profile:canvas.dotMatrixProfile};
}
const black=render(()=>[0,0,0,255]);assert.equal(black.arcs.length,0);
assert.equal(render(()=>[255,255,255,0]).arcs.length,0);
const gradient=g=>x=>{const v=g*(15+205*x/119);return [v,v,v,255]};
const bright=render(gradient(1)),dim=render(gradient(.5));
assert(bright.profile.white>dim.profile.white*1.8,'Exposure follows source range');
for(const result of [bright,dim]){
 assert(result.arcs.every(([x,y,r])=>x%6===3&&y%6===3&&r>0&&r<=2.4));
 const radii=result.arcs.map(a=>a[2]);
 assert(Math.max(...radii)>Math.min(...radii)*2,'Preserve diameter range');
 assert(radii.filter(r=>r>2.35).length<radii.length*.1,'Avoid widespread clipping');
}
assert.deepEqual(render(gradient(1)),bright,'Deterministic output');
const frozen=render(gradient(.5),120,bright.profile);assert.deepEqual(frozen.profile,bright.profile);
const broad=render(()=>[180,180,180,255]);
const narrow=render(x=>x>=54&&x<66?[180,180,180,255]:[0,0,0,255]);
assert(Math.max(...narrow.arcs.map(a=>a[2]))<Math.max(...broad.arcs.map(a=>a[2]))*.7,'Narrow forms attenuated');
assert(Math.max(...narrow.arcs.map(a=>a[2]))>.3,'Stems remain visible');
console.log('Passed: adaptive range, no widespread clipping, black/transparency, fixed grid, repeatability, frozen profile, stem visibility.');

let frames=[],current=[];
globalThis.document={createElement:()=>({getContext:()=>({
 fillRect(){current=[];frames.push(current)},beginPath(){},
 arc(x,y,r){this.geometry=[x,y,r]},fill(){current.push({geometry:this.geometry,color:this.fillStyle})}
})})};
const pixels=new Uint8ClampedArray(24*24*4).fill(255);
const animated=renderDotMatrix(pixels,24,24,6,1,null,['#FF6E14','#34A4FA']);
animated.repaintGradient(0);const first=current;
animated.repaintGradient(.25);const next=current;
assert.deepEqual(first.map(d=>d.geometry),next.map(d=>d.geometry),'Animation keeps dot geometry fixed');
assert.notDeepEqual(first.map(d=>d.color),next.map(d=>d.color),'Animation changes colour');
animated.repaintGradient(1);assert.deepEqual(current,first,'Loop is seamless');
console.log('Passed: gradient colour animation, stable geometry, seamless cycle.');

const diagonal=first.filter(d=>d.geometry[0]+d.geometry[1]===24);
assert(new Set(diagonal.map(d=>d.color)).size>1,'Colour pools vary across the old linear gradient diagonal');
animated.repaintGradient(.00001);
for(let i=0;i<first.length;i++){
 const a=first[i].color.match(/\d+/g).map(Number),b=current[i].color.match(/\d+/g).map(Number);
 assert(a.every((v,j)=>Math.abs(v-b[j])<=1),'No sudden colour jumps');
}
console.log('Passed: spatial colour pools and smooth motion.');
