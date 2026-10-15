import assert from 'node:assert/strict';
import {gridAdaptiveTone,gridLettersMask} from '../source/adaptive-tone.js';

// Frozen pre-optimization reference, including its independent video history.
const history=new WeakMap();
function sortedTone(data,source=null,time=0){
 const samples=[];let peak=0;
 for(let i=0;i<data.length;i+=16){const l=Math.sqrt(.299*data[i]**2+.587*data[i+1]**2+.114*data[i+2]**2)/255*data[i+3]/255;peak=Math.max(peak,l);if(l>.012)samples.push(l)}
 samples.sort((a,b)=>a-b);
 const at=p=>samples.length?samples[Math.floor((samples.length-1)*p)]:0;
 let black=Math.min(.035,at(.08)*.25),white=Math.max(.12,at(.96));
 if(source?.tagName==='VIDEO'){
  const old=history.get(source),dt=old?time-old.time:0;
  if(old&&dt>=0&&dt<.7){const blend=1-Math.exp(-dt/.35);black=old.black+(black-old.black)*blend;white=old.white+(white-old.white)*blend}
  history.set(source,{black,white,time});
 }
 const clamp=v=>Math.max(0,Math.min(1,v));
 return {black,white,peak,high:white,low:black,tone:l=>Math.pow(clamp((l-black)/Math.max(.10,white-black)),.65),coverage:l=>{const t=clamp((l-Math.max(.008,black*.5))/Math.max(.012,white*.08));return t*t*(3-2*t)}};
}
let state=0x12345678;
const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0};
const make=(pixels,fill)=>{const data=new Uint8ClampedArray(pixels*4);for(let i=0;i<pixels;i++)data.set(fill(i),i*4);return data};
const fields=['black','white','peak','high','low'];let cases=0,masks=0;
function compare(data,label,source=null,time=0,mask=true){
 const expected=sortedTone(data,source,time),actual=gridAdaptiveTone(data,source,time);
 for(const field of fields)assert.ok(Object.is(actual[field],expected[field]),`${label}: ${field} differs`);
 for(const light of [-1,0,.001,.008,.012,.035,.08,.12,.25,.5,.96,1,2,Infinity,NaN])for(const method of ['tone','coverage'])assert.ok(Object.is(actual[method](light),expected[method](light)),`${label}: ${method}(${light}) differs`);
 if(mask)for(const [contrast,gamma]of[[1,1],[0,.2],[.35,2.7],[3,.65]]){assert.deepEqual(gridLettersMask(data,actual,contrast,gamma),gridLettersMask(data,expected,contrast,gamma),`${label}: byte mask differs`);masks++}
 cases++;
}
for(const pixels of [0,1,2,3,4,5,8,12,16,20,64,256,4096]){
 compare(make(pixels,()=>[0,0,0,0]),`empty/transparent ${pixels}`);
 compare(make(pixels,()=>[255,255,255,255]),`flat white ${pixels}`);
 compare(make(pixels,()=>[12,25,65,255]),`flat dark blue ${pixels}`);
 compare(make(pixels,i=>i%7?[80,15,180,255]:[255,255,255,128]),`duplicate ${pixels}`);
 compare(make(pixels,()=>[random()%256,random()%256,random()%256,random()%256]),`random ${pixels}`);
}
for(const order of ['ascending','descending','organ-pipe','alternating']){
 const pixels=65536;
 compare(make(pixels,i=>{const j=order==='ascending'?i:order==='descending'?pixels-1-i:order==='organ-pipe'?Math.min(i,pixels-1-i)*2:i%2?i:pixels-1-i;const value=Math.floor(j/pixels*255);return[value,value,value,255]}),order);
}
for(let i=0;i<64;i++)compare(make(random()%4096,()=>{const value=random()%256;return i%2?[value,value,value,255]:[value,random()%256,random()%256,random()%256]}),`seeded frame ${i}`);
compare(make(600*600,()=>[random()%256,random()%256,random()%256,random()%256]),'600px random',null,0,false);
const source={tagName:'VIDEO'};
for(const [i,time]of[0,.033,.066,.066,.16,.699,.7,1.4,.3,.333,5,4.9,4.93].entries())compare(make(4096,()=>i%3?[random()%256,random()%256,random()%256,255]:[8,17,31,255]),`video ${i}@${time}`,source,time);
console.log(`Exact adaptive tone: ${cases} sorted-reference profiles and ${masks} byte masks passed, including duplicate-heavy images, ranks, extremes and video seek/history.`);
