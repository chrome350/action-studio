import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {lettersColorField} from '../source/letters-color.js';
const w=120,h=80,data=new Uint8ClampedArray(w*h*4).fill(255);
const field=lettersColorField(data,w,h,['#FF0000','#0000FF']);
assert.equal(field(0,0,1),'rgb(255,0,0)');assert.equal(field(w,h,1),'rgb(0,0,255)');
assert.equal(field(30,30,0),'rgb(0,0,0)');
const solid=lettersColorField(data,w,h,['#34A4FA']);assert.equal(solid(0,0,1),'rgb(52,164,250)');assert.equal(solid(120,80,1),solid(0,0,1));
const s=await fs.readFile(new URL('../assets/index-BwYdjEfo.js',import.meta.url),'utf8');
const start=s.indexOf('function mb('),end=s.indexOf('function qf(',start);
let calls=[];
const context={save(){},restore(){},clearRect(){},measureText(){return {width:4}},fillText(){},drawImage(){},fillRect(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}};
const sandbox={Math,Hn:()=>[0,0,0],cb:d=>d,Rh:'ABC',document:{createElement:()=>({getContext:()=>context})}};
vm.createContext(sandbox);vm.runInContext(s.slice(start,end),sandbox);
const input=new Uint8ClampedArray(20*20*4).fill(255);
const sample=(x,y,j)=>{calls.push([x,y,j]);return '#ff0000'};
sandbox.mb(context,input,20,20,4,'#000000','#ffffff',1,1,200,100,sample);
assert.ok(calls.length);assert.ok(calls.every(([x,y])=>x>195&&y>95),'sample uses canvas coordinates, not local cell coordinates');
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const text=await fs.readFile(new URL('../'+name,import.meta.url),'utf8');
 assert.equal(text.split('/* grid-letters-color:start */').length,2);
 assert.equal(text.split('id:"letters-palette"').length,2);
 assert.ok(text.includes('ribbonMask,lettersPalette,lettersInteractive,lettersRadius,lettersStrength]'));
 assert.ok(text.includes('setLettersPalette("confa")'));
}
console.log('Letters: palette endpoints, solid colour, tone, global cell sampling, both builds and reset passed.');
