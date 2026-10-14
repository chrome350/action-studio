import assert from 'node:assert/strict';
import {renderCirclePacking} from '../source/circle-packing.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},beginPath(){},arc(){},stroke(){}})})};
const width=240,height=240,data=new Uint8ClampedArray(width*height*4);
const inside=(x,y)=>Math.hypot(x-120,y-90)<72||(x>112&&x<128&&y>90&&y<230);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data[i]=inside(x,y)?200:0;data[i+3]=255;}
const a=renderCirclePacking(data,width,height,44).packingCircles;
assert(a.length>=3&&a.length<=44);
assert.deepEqual(a,renderCirclePacking(data,width,height,44).packingCircles);
for(const c of a){
 for(let angle=0;angle<Math.PI*2;angle+=.025){
  const x=Math.floor(c.x+(c.r+.4)*Math.cos(angle)),y=Math.floor(c.y+(c.r+.4)*Math.sin(angle));
  assert(x>=0&&y>=0&&x<width&&y<height&&data[(y*width+x)*4]>30,'Stroke stays in foreground');
 }
 for(const other of a)if(other!==c)assert(Math.hypot(c.x-other.x,c.y-other.y)>=c.r+other.r+1.49,'Circle gap');
}
assert(a.filter(c=>c.narrow).length<=Math.round(44*.20));
assert(Math.max(...a.map(c=>c.r))>Math.min(...a.map(c=>c.r))*5);
assert.equal(renderCirclePacking(new Uint8ClampedArray(data.length),width,height).packingCircles.length,0);
const transparent=data.slice();for(let i=3;i<transparent.length;i+=4)transparent[i]=0;
assert.equal(renderCirclePacking(transparent,width,height).packingCircles.length,0);
console.log('PASS: sparse hierarchy, containment, gaps, deterministic layout, limited stem circles, black/transparent input.');

assert(renderCirclePacking(data,width,height,80).packingCircles.length>renderCirclePacking(data,width,height,16).packingCircles.length,"Higher limit adds structure");
