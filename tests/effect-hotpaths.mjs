import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {transform} from 'esbuild';
import {gridBlurPlane} from '../source/blur-plane.js';
import {ribbonPixels} from '../source/ribbon-stretch.js';

const actionSource=await fs.readFile(new URL('../source/clean-effect.ts',import.meta.url),'utf8');
const compiled=(await transform(actionSource,{loader:'ts',format:'esm',target:'es2022'})).code;
const {preparePixels}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');

function actionPixels(width,height,seed) {
  const data=new Uint8ClampedArray(width*height*4);
  for(let p=0;p<width*height;p++){
    const x=p%width,y=Math.floor(p/width),i=p*4;
    data[i]=(x*29+y*37+seed*13)%256;
    data[i+1]=(x*x+y*19+seed*7)%256;
    data[i+2]=(x*11+y*y+seed*23)%256;
    data[i+3]=seed%3===0?255:((x+y+seed)%5?255:(x*17+y*41+seed)%256);
  }
  return data;
}
function ribbonFrame(width,height,seed) {
  const data=new Uint8ClampedArray(width*height*4),mask=new Uint8ClampedArray(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=y*width+x,i=p*4;
    data[i+3]=seed%3===0?Math.round(255*x/width):255;
    if(x>width*.38&&x<width*.89&&y>height*.10&&y<height*.9){
      data[i]=120+(x*7+y*5+seed)%130;data[i+1]=70+(x+y*9)%170;data[i+2]=90+(y*11+seed)%160;
    }
    // Include a protected foreground stem, a source hole, and disjoint patches.
    if(x===Math.floor(width*.2)){data[i]=30;data[i+1]=140;data[i+2]=60;}
    if(y===Math.floor(height*.43)&&x<width*.60){data[i]=data[i+1]=data[i+2]=0;}
    if(x>width*.37&&x<width*.63&&y>height*.23&&y<height*.78&&(seed%2||y<height*.40||y>height*.55))mask[p]=(x+y+seed)%7?255:125;
  }
  return {data,mask};
}

// Captured before the hot-loop changes. Repeated dimensions, source aspect
// ratios, and changing settings exercise the exact Float64 geometry cache.
const actionCases=[
  [73,59,1,24,1,1,'#FFFFFF','#07080B',80,16,736,977,16,'63bc444b3bca605fc35bcdce688e3b81a54de9bf1e057d36a1f6e504bc3cd499'],
  [73,59,2,96,1.43,.8,'#34A4FA','#182033',100,40,736,977,70,'a5d80534cc9579d6b42e9c99a22a7fa8f8c9e9fd926a777b0d11a1e78fc37a06'],
  [73,59,3,0,2,1,'#FF6E14','#020305',0,0,736,977,100,'abf0d3f831a2ff10cdd2e75b303f8fdce3b664f8e8d58fb63f9e003042c00538'],
  [73,59,4,14,0,1,'#FFFFFF','#07080B',25,40,736,977,0,'26a1ec1af876aeb022b1f8904940ac2cf0fc296a651a27440d325dd9a3cb2b3d'],
  [113,89,5,60,.5,1.5,'#FF6E14','#07080B',25,0,100,60,0,'0322fe28ea7e8b218b58a737d78a69f803ccc9141a364e9ae51496f0b02a6dfa'],
  [113,89,6,12,1,1,'#34A4FA','#000000',150,35,60,100,23,'0c5e5f30cdf99487bdc223f0eea16434c765a0b69c63e203906362e08e448141'],
  [1,19,7,96,1.7,.65,'#FFFFFF','#FFFFFF',200,40,1,19,100,'f23d9ee2ba3f908b1532a10c56526e78f2bafed3757a4f9b95866159473dd4f9'],
  [23,1,8,2,.2,2.3,'#34A4FA','#101112',1,0,19,1,10,'6c64a44f74a7cda3bc9b53fd51524542531c0c9337f1f4df5e2548566465206a'],
  [1,1,9,0,1,1,'#FFFFFF','#07080B',80,16,1,1,16,'445a9064216a6da3c4a1296d9d5b65d16c4ceb707a1b1fbfaa3d7f065cc06fab'],
  [73,59,1,24,1,1,'#FFFFFF','#07080B',80,16,736,977,16,'63bc444b3bca605fc35bcdce688e3b81a54de9bf1e057d36a1f6e504bc3cd499'],
  [73,59,1,24,1,1,'#FFFFFF','#07080B',80,16,977,736,16,'0618d4ea3e707b84d105bd3e6274040a9e6bcbbe4b2cd3ffbe68897539f87bd4'],
];
for(const [w,h,seed,radius,contrast,gamma,accent,ink,intensity,trail,sw,sh,clarity,expected] of actionCases){
  const input=actionPixels(w,h,seed),saved=input.slice();
  const output=preparePixels(input,w,h,radius,contrast,gamma,gridBlurPlane,accent,ink,intensity,trail,sw,sh,clarity);
  assert.equal(hash(output),expected,`Action exact pixels: ${w}x${h}, seed=${seed}, source=${sw}x${sh}`);
  assert.deepEqual(input,saved,'Action source remains immutable');
}

const ribbonCases=[
  [84,68,1,85,24,45,'left','142067fed3054b5a1f630b10e764519be00dad13eac8f70e71729e440dee9866'],
  [84,68,1,85,24,45,'right','c6defa1a8a356bdf491f93721bccdb10f38a43410dadfecdb1f0daafbd872654'],
  [84,68,2,15,1,0,'left','49f7d1c54a65b4fd74f3ca4c9d2f5faa2753de6a143a0bd9d6a6ff15a5f4df44'],
  [84,68,2,15,1,100,'right','b1f20ad22ffb9ef089666506abcfe4215636e199b43939cdb519021089475fbb'],
  [113,89,3,100,40,100,'left','c171c1da6ac26b435c02ab686f2cd5408444a6d9dab9fc47d1318dbb28ff6b3f'],
  [113,89,3,100,40,0,'right','b4bbf380ef8b4125f98a2120bc8d2f8c238fb11d838ead566ec0ba595030c5b2'],
  [93,71,4,1,40,85,'left','0dd7683cd7602dcde469fead342ec77241cb262614d7982fde180bf4367645c3'],
  [93,71,5,0,24,45,'right','fbf917224424d1e8322513dd358e060f09f5013dbfdac6f87e97f719bab30379'],
  [41,37,6,35,8,70,'right','002f3b44d63e3f1f1339940457ad3fc3a9dbbf1038b6db55a93e4d0ca1f25cdb'],
  [41,37,7,35,8,70,'left','40467d4fbfc08cca7566bab26bdb721b365689d52332b4f2c0c4056fea71c93b'],
  [17,13,8,100,1,100,'right','fb9cf48c53d8ac06a7047bcf15d758ff8af9131d36aaec6ac6f33d96383eb3ec'],
  [17,13,9,100,40,0,'left','4751adf859af7a67d9d48eb392434135dc6acb696f16135c404504b3266a0e8c'],
];
for(const [w,h,seed,length,capture,bend,direction,expected] of ribbonCases){
  const {data,mask}=ribbonFrame(w,h,seed),saved=data.slice(),savedMask=mask.slice();
  assert.equal(hash(ribbonPixels(data,w,h,length,capture,bend,direction,mask)),expected,`Ribbons exact pixels: ${w}x${h}, seed=${seed}, ${direction}`);
  assert.deepEqual(data,saved,'Ribbon source remains immutable');
  assert.deepEqual(mask,savedMask,'Ribbon mask remains immutable');
}
console.log('Effect hot loops: 11 exact Action frames/cache invalidations and 12 exact Ribbons frames, holes, disconnected surfaces, transparency, directions and extremes passed.');
