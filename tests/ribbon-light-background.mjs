import assert from 'node:assert/strict';
import {ribbonPixels} from '../source/ribbon-stretch.js';
const w=120,h=80;
for(const base of [[240,240,240],[130,160,180],[0,0,0]])for(const padding of [0,5])for(const direction of ['left','right']) {
  const data=new Uint8ClampedArray(w*h*4),mask=new Uint8ClampedArray(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const bar=x<padding||x>=w-padding;
    const bg=base.map(v=>v?Math.min(255,v+y*.2+x*.05):0);
    data.set([...(bar?[0,0,0]:bg),255],(y*w+x)*4);
    if(x>=50&&x<75&&y>=20&&y<60)data.set([190,20+y,40,255],(y*w+x)*4);
    if(x>=48&&x<60&&y>=28&&y<50)mask[y*w+x]=255;
  }
  const mirror=(a,n)=>{const out=new Uint8ClampedArray(a.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++)out.set(a.slice((y*w+x)*n,(y*w+x+1)*n),(y*w+w-1-x)*n);return out};
  const input=direction==='left'?data:mirror(data,4),selection=direction==='left'?mask:mirror(mask,1);
  const out=ribbonPixels(input,w,h,70,20,0,direction,selection);
  const pixel=(38*w+(direction==='left'?30:w-1-30))*4;
  assert.notDeepEqual(out.slice(pixel,pixel+4),input.slice(pixel,pixel+4),`extends over ${base} padding ${padding} ${direction}`);
  for(let y=20;y<60;y++)for(let x=62;x<75;x++) {
    const i=(y*w+(direction==='left'?x:w-1-x))*4;
    assert.deepEqual(out.slice(i,i+4),input.slice(i,i+4),'unselected subject preserved');
  }
}
console.log('Passed: white, blue-gray gradients and black backgrounds, fitting bars, both directions, preserved subject.');
