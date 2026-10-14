import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {ribbonPixels} from '../source/ribbon-stretch.js';
const w=120,h=80,data=new Uint8ClampedArray(w*h*4),mask=new Uint8ClampedArray(w*h);
for(let p=0;p<w*h;p++)data[p*4+3]=255;
for(let y=20;y<55;y++)for(let x=55;x<100;x++)data.set([180+x%50,80+y,160,255],(y*w+x)*4);
// A separate stem in the path of the ribbon must survive untouched.
for(let y=0;y<h;y++)data.set([40,150,50,255],(y*w+30)*4);
for(let y=25;y<45;y++)for(let x=53;x<65;x++)mask[y*w+x]=255;
assert.deepEqual(ribbonPixels(data,w,h),data,'no selection is identity');
assert.deepEqual(ribbonPixels(data,w,h,0,8,30,'left',mask),data,'zero length is identity');
const out=ribbonPixels(data,w,h,70,20,0,'left',mask);
assert.notDeepEqual(out,data,'selection produces a ribbon');
assert.ok(Array.from(mask).some((v,p)=>v && out[p*4]!==data[p*4]),'selected surface itself deforms');
for(let p=0;p<w*h;p++)if(!mask[p] && (data[p*4] || data[p*4+1] || data[p*4+2]))assert.deepEqual(out.slice(p*4,p*4+4),data.slice(p*4,p*4+4),'unselected foreground is byte-identical');
for(let y=0;y<h;y++)if(y<25||y>=45)assert.deepEqual(out.slice(y*w*4,(y+1)*w*4),data.slice(y*w*4,(y+1)*w*4),'unselected rows unchanged');
const short=ribbonPixels(data,w,h,10,20,0,'left',mask);
assert.deepEqual(short.slice((35*w+10)*4,(35*w+10)*4+4),data.slice((35*w+10)*4,(35*w+10)*4+4),'finite length');
assert.notDeepEqual(ribbonPixels(data,w,h,70,1,0,'left',mask),out,'capture changes source band');
function mirror(a,channels){const b=new Uint8ClampedArray(a.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++)b.set(a.slice((y*w+x)*channels,(y*w+x+1)*channels),(y*w+w-1-x)*channels);return b}
assert.deepEqual(ribbonPixels(mirror(data,4),w,h,70,20,30,'right',mirror(mask,1)),mirror(ribbonPixels(data,w,h,70,20,30,'left',mask),4),'mirrored direction');
const clear=new Uint8ClampedArray(data.length);assert.deepEqual(ribbonPixels(clear,w,h,70,20,30,'left',mask),clear,'transparent selection remains transparent');
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const s=await fs.readFile(new URL('../'+name,import.meta.url),'utf8');
 assert.equal(s.split('/* grid-ribbon-stretch:start */').length,2);
 assert.ok(s.includes('ribbonCapture,ribbonBend,ribbonDirection,ribbonMask'));
 assert.ok(s.includes('U.jsx(RibbonBrush,{mask:ribbonMask'));
 assert.ok(!s.includes('ribbonAnchor'));
}
console.log('Passed: empty mask, zero length, preserved foreground and stem, local rows, finite length, capture width, mirroring, transparency, integration.');
// Exercise actual brush handlers without a browser: scaled touch/pen coordinates,
// continuous strokes, erasing, pointer capture and commit only on release.
const {default:vm}=await import('node:vm');
const source=await fs.readFile(new URL('../source/ribbon-stretch.js',import.meta.url),'utf8');
let committed=null,captured=null;
const ctx={createImageData:()=>({data:new Uint8ClampedArray(600*600*4)}),putImageData:()=>{}};
const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({left:10,top:20,width:300,height:300}),setPointerCapture:id=>{captured=id}};
const sandbox={Uint8ClampedArray,Math,O:{useRef:value=>({current:value===null?canvas:value}),useEffect:()=>{}},U:{jsx:(type,props)=>props}};
// The second ref is a stroke, not a canvas; preserve the real null initializer.
let refs=0;sandbox.O.useRef=value=>({current:refs++===0?canvas:value});
vm.createContext(sandbox);vm.runInContext(source.slice(source.indexOf('function RibbonBrush')),sandbox);
const blank=new Uint8ClampedArray(360000);
let brush=sandbox.RibbonBrush({mask:blank,onChange:m=>committed=m,size:20,erase:false,active:true});
const event=(x,y)=>({button:0,pointerId:7,currentTarget:canvas,clientX:x,clientY:y,preventDefault(){}});
brush.onPointerDown(event(60,70));brush.onPointerMove(event(110,70));
assert.equal(committed,null,'no expensive render during stroke');assert.equal(captured,7);
brush.onPointerUp(event(110,70));
assert.equal(committed[100*600+100],255);assert.equal(committed[100*600+150],255);assert.equal(committed[100*600+200],255);
assert.equal(blank.some(v=>v),false,'state mask not mutated');
refs=0;brush=sandbox.RibbonBrush({mask:committed,onChange:m=>committed=m,size:20,erase:true,active:true});
brush.onPointerDown(event(85,70));brush.onPointerCancel(event(85,70));assert.equal(committed[100*600+150],0,'eraser and cancel commit');
console.log('Brush checks passed: scaled coordinates, stroke interpolation, immutability, eraser, pointer capture and cancel.');

refs=0;const hiddenBrush=sandbox.RibbonBrush({mask:committed,onChange:()=>{},size:20,erase:false,active:true,showMask:false});
assert.equal(hiddenBrush.style.opacity,0,'selection can be hidden');
assert.equal(hiddenBrush.style.pointerEvents,'auto','brush remains usable with hidden selection');
console.log('Independent selection visibility passed.');
// A dark slit inside one connected painted patch must not become a gap all
// the way across its ribbon. Other foreground still remains untouched.
const slitData=new Uint8ClampedArray(data);
for(let x=55;x<65;x++)slitData.set([0,0,0,255],(34*w+x)*4);
const repaired=ribbonPixels(slitData,w,h,70,20,0,'left',mask);
for(let y=29;y<=39;y++){
 const i=(y*w+15)*4;
 assert.ok(repaired[i]+repaired[i+1]+repaired[i+2]>100,'connected surface spans source slit');
}
const bent=ribbonPixels(slitData,w,h,70,20,65,'left',mask);
for(let p=0;p<w*h;p++)if(!mask[p]&&(slitData[p*4]||slitData[p*4+1]||slitData[p*4+2]))assert.deepEqual(bent.slice(p*4,p*4+4),slitData.slice(p*4,p*4+4));
console.log('Connected surface: source slit filled, unselected foreground preserved with folds.');
const faded=ribbonPixels(data,w,h,90,20,0,'left',mask);
const brightness=x=>{const i=(35*w+x)*4;return faded[i]+faded[i+1]+faded[i+2]};
assert.ok(brightness(1)<brightness(20)*.25,'ribbon fades toward the canvas edge');
assert.deepEqual(ribbonPixels(mirror(data,4),w,h,90,20,70,'right',mirror(mask,1)),mirror(ribbonPixels(data,w,h,90,20,70,'left',mask),4),'fold geometry and fade mirror');
console.log('Fold geometry: direction symmetry and edge transparency passed.');
const exportSource=source.slice(source.indexOf('function drawRibbonExport'),source.indexOf('/** Separate overlay'));
const exportSandbox={Math};vm.createContext(exportSandbox);vm.runInContext(exportSource,exportSandbox);
const rectangles=[],draws=[],highImage={width:1200,height:1200};
exportSandbox.drawRibbonExport({canvas:{width:1080},save(){},restore(){},beginPath(){},rect(...r){rectangles.push(r)},clip(){},drawImage(...args){draws.push(args)}},{image:highImage,columns:2,rows:2,mode:'letters',cells:{1:{mode:'ribbons'}},grid:false});
assert.deepEqual(rectangles,[[540,0,540,540]],'export clips to the selected ribbon cell');
assert.equal(draws[0][0],highImage,'export uses high resolution source');
console.log('High resolution export: source and mixed-cell clip passed.');
