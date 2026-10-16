import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {gridForegroundForEffects,gridAdaptiveTone,gridLettersMask} from '../source/adaptive-tone.js';
import {lettersColorField} from '../source/letters-color.js';
import {renderDotMatrix} from '../source/dot-matrix.js';
import {gridBlurPlane} from '../source/blur-plane.js';
import {ribbonPixels} from '../source/ribbon-stretch.js';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData,loadImage}=require(process.env.GRID_CANVAS_PATH||'@napi-rs/canvas');
const document={createElement:()=>createCanvas(1,1)};
globalThis.document=document;globalThis.ImageData=ImageData;
const runtime=await fs.readFile(new URL('../assets/index-BwYdjEfo.js',import.meta.url),'utf8');
const source=runtime.slice(runtime.indexOf('function mb('),runtime.indexOf('function qf('));
const scope={document,ImageData,Uint8ClampedArray,Math,Rh:Array.from('AVITO ACTION'),Hn:hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),gridLettersMask};
vm.createContext(scope);vm.runInContext(source,scope);
const w=96,h=96,raw=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++)raw.set(x>20&&x<76&&y>16&&y<80?[80,90,110,255]:[255,255,255,255],(y*w+x)*4);
const data=gridForegroundForEffects(raw,w,h),profile=gridAdaptiveTone(data);
assert.equal(data[3],0);
const canvas=createCanvas(w,h),ctx=canvas.getContext('2d');
const field=lettersColorField(data,w,h,['#D02040','#D02040'],profile);
scope.mb(ctx,data,w,h,8,'#00000000','#FFFFFF',1,1,0,0,field);
const glyphs=ctx.getImageData(0,0,w,h).data;
assert.equal(glyphs[3],0,'Letters background is transparent');
let visible=0,clearInside=0,coloured=0;
for(let y=20;y<76;y++)for(let x=24;x<72;x++){
 const i=(y*w+x)*4;if(!glyphs[i+3])clearInside++;else{visible++;if(glyphs[i]>glyphs[i+1]*2)coloured++;}
}
assert.ok(visible>50&&clearInside>visible,'only glyph shapes remain, not an opaque object silhouette');
assert.ok(coloured>visible*.9,'selected red glyph colour is preserved');
const exported=await loadImage(canvas.toBuffer('image/png'));
const roundtrip=createCanvas(w,h);roundtrip.getContext('2d').drawImage(exported,0,0);
assert.equal(roundtrip.getContext('2d').getImageData(0,0,1,1).data[3],0,'PNG retains alpha');
const dots=renderDotMatrix(data,w,h,6,1,profile,['#D02040','#D02040'],null,null,true);
assert.equal(dots.getContext('2d').getImageData(0,0,1,1).data[3],0,'Dots retain transparency');
dots.repaintGradient(.4);assert.equal(dots.getContext('2d').getImageData(0,0,1,1).data[3],0,'animated dots never repaint black');
const compiled=await build({entryPoints:['source/clean-effect.ts'],bundle:true,write:false,format:'esm'});
const {preparePixels,prepare,draw}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const action=preparePixels(data,w,h,24,1,1,gridBlurPlane,'#FFFFFF','#000000',80,16,w,h,16);
assert.equal(action[3],255,'original Action remains opaque');
const glow=prepare(data,w,h,24,1,1,gridBlurPlane,'#FFFFFF','#000000',80,16,w,h,16);
const animation=createCanvas(w,h);draw(animation.getContext('2d'),glow,1,80,16);
assert.equal(animation.getContext('2d').getImageData(0,0,1,1).data[3],255,'original animated Action remains opaque');
console.log('Real canvas: coloured glyphs only, transparent spaces inside/outside the shape, PNG alpha, animated Dots and original opaque Action passed.');

// Transparency belongs to Letters only; the other final outputs restore the backdrop.
const meta={};gridForegroundForEffects(raw,w,h,null,meta);
assert.deepEqual(Array.from(meta.background.slice(0,4)),[255,255,255,255]);
const overBackdrop=layer=>{
 const final=createCanvas(w,h),context=final.getContext('2d');
 context.putImageData(new ImageData(meta.background,w,h),0,0);context.drawImage(layer,0,0);return context;
};
assert.deepEqual(Array.from(overBackdrop(dots).getImageData(0,0,1,1).data),[255,255,255,255],'Dots final image preserves opaque white backdrop');
const actionLayer=createCanvas(w,h);actionLayer.getContext('2d').putImageData(new ImageData(action,w,h),0,0);
assert.equal(overBackdrop(actionLayer).getImageData(0,0,1,1).data[3],255,'Action final image is opaque');
const ribbonsLayer=createCanvas(w,h);ribbonsLayer.getContext('2d').putImageData(new ImageData(ribbonPixels(data,w,h),w,h),0,0);
assert.equal(overBackdrop(ribbonsLayer).getImageData(0,0,1,1).data[3],255,'Ribbons final image is opaque');
assert.equal(ctx.getImageData(0,0,1,1).data[3],0,'Letters final image remains transparent');
const blue=new Uint8ClampedArray(raw);for(let p=0;p<w*h;p++)if(raw[p*4]===255)blue.set([218,235,242,255],p*4);
const blueMeta={};gridForegroundForEffects(blue,w,h,null,blueMeta);
assert.deepEqual(Array.from(blueMeta.background.slice(0,4)),[218,235,242,255],'pastel backdrop colour remains exact');
console.log('Internal glyph alpha and opaque effect composition passed.');
