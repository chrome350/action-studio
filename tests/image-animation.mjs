import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {gridImageIsAnimated} from '../source/image-animation.js';

const ascii=text=>Uint8Array.from(text,character=>character.charCodeAt(0));
const concat=(...arrays)=>{const result=new Uint8Array(arrays.reduce((sum,array)=>sum+array.length,0));let offset=0;for(const array of arrays){result.set(array,offset);offset+=array.length;}return result;};
const uint32=(value,littleEndian=false)=>{const bytes=new Uint8Array(4);new DataView(bytes.buffer).setUint32(0,value,littleEndian);return bytes;};
const pngChunk=(type,data=new Uint8Array())=>concat(uint32(data.length),ascii(type),data,new Uint8Array(4));
const png=(...chunks)=>concat(new Uint8Array([137]),ascii('PNG\r\n\x1a\n'),...chunks);
const header=pngChunk('IHDR',new Uint8Array(13)),pixels=pngChunk('IDAT',new Uint8Array([1])),end=pngChunk('IEND');
const stillPng=png(header,pixels,end);
assert.equal(gridImageIsAnimated(stillPng),false,'PNG without animation chunks is static');
assert.equal(gridImageIsAnimated(png(header,pngChunk('acTL',new Uint8Array(8)),pixels,end)),true,'APNG is animated');
assert.equal(gridImageIsAnimated(png(header,pngChunk('tEXt',ascii('acTL')),pixels,end)),false,'animation text inside another chunk is ignored');
assert.equal(gridImageIsAnimated(png(header,pixels)),true,'PNG missing IEND remains conservative');
assert.equal(gridImageIsAnimated(png(end)),true,'PNG missing header and pixels remains conservative');
assert.equal(gridImageIsAnimated(stillPng.subarray(0,stillPng.length-1)),true,'truncated PNG remains conservative');
assert.equal(gridImageIsAnimated(concat(stillPng,new Uint8Array([0]))),true,'unexpected trailing PNG bytes remain conservative');
const hugePng=png(header,uint32(0xffffffff),ascii('IDAT'),new Uint8Array(4));
assert.equal(gridImageIsAnimated(hugePng),true,'invalid PNG chunk length remains conservative');
const paddedPng=concat(new Uint8Array(7),stillPng,new Uint8Array(3)).subarray(7,7+stillPng.length);
assert.equal(gridImageIsAnimated(paddedPng),false,'typed array byte offsets are respected');

const webpChunk=(type,data)=>concat(ascii(type),uint32(data.length,true),data,new Uint8Array(data.length%2));
const webp=(...chunks)=>{const body=concat(ascii('WEBP'),...chunks);return concat(ascii('RIFF'),uint32(body.length,true),body);};
const lossy=webpChunk('VP8 ',new Uint8Array([1,2,3]));
const lossless=webpChunk('VP8L',new Uint8Array([1,2]));
assert.equal(gridImageIsAnimated(webp(lossy)),false,'simple lossy WebP is static');
assert.equal(gridImageIsAnimated(webp(lossless)),false,'lossless WebP is static');
assert.equal(gridImageIsAnimated(webp(webpChunk('VP8X',new Uint8Array(10)),lossy)),false,'extended still WebP is static');
const animatedHeader=new Uint8Array(10);animatedHeader[0]=2;
assert.equal(gridImageIsAnimated(webp(webpChunk('VP8X',animatedHeader),lossy)),true,'VP8X animation flag is recognized');
assert.equal(gridImageIsAnimated(webp(webpChunk('ANIM',new Uint8Array(6)),lossy)),true,'WebP ANIM chunk is recognized');
assert.equal(gridImageIsAnimated(webp(webpChunk('ANMF',new Uint8Array(16)),lossy)),true,'WebP animation frame chunk is conservative');
assert.equal(gridImageIsAnimated(webp(webpChunk('VP8X',new Uint8Array(1)),lossy)),true,'truncated extended WebP header stays conservative');
assert.equal(gridImageIsAnimated(webp(webpChunk('EXIF',ascii('ANIM')),lossy)),false,'metadata text does not imply animation');
assert.equal(gridImageIsAnimated(webp(lossy).subarray(0,22)),true,'truncated WebP stays conservative');
assert.equal(gridImageIsAnimated(webp()),true,'WebP without image pixels stays conservative');
for(const input of [new Uint8Array(),ascii('GIF89a'),ascii('<svg><animate/></svg>'),ascii('unknown'),null])assert.equal(gridImageIsAnimated(input),true,'unknown and potentially animated formats remain live');
assert.equal(gridImageIsAnimated(new Uint8Array([255,216,255,224])),false,'JPEG is static');
assert.equal(gridImageIsAnimated(ascii('BM')),false,'BMP is static');

// Exercise the real source-loading hook, including an async result arriving
// after its source has been disposed/replaced.
const source=await fs.readFile(new URL('../source/video.js',import.meta.url),'utf8');
const hook=source.slice(source.indexOf('function useGridVideo'),source.indexOf('function GridVideoControls'));
const pending=[],effects=[];
const sandbox={
  Uint8Array,gridImageIsAnimated,fetch:url=>new Promise((resolve,reject)=>pending.push({url,resolve,reject})),
  Image:class{addEventListener(){}},
  document:{addEventListener(){},removeEventListener(){}},
  O:{useState:value=>[value,()=>{}],useRef:current=>({current}),useLayoutEffect:effect=>effects.push(effect),useEffect(){}},
  setTimeout(){},URL:{revokeObjectURL(){}},
};
vm.createContext(sandbox);vm.runInContext(hook,sandbox);
const mediaRef={current:null};
const load=url=>{
  sandbox.useGridVideo(url,'image',mediaRef,{current:false},()=>{},{},{},{},0,0);
  return effects.pop()();
};
const resolveBytes=async(request,bytes)=>{
  request.resolve({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  for(let i=0;i<5;i++)await Promise.resolve();
};
const disposeFirst=load('/first.png'),first=mediaRef.current;
assert.equal(first.gridAnimated,true,'image stays live until classified');
assert.equal(pending[0].url,'/first.png','classification reads the same loaded URL');
disposeFirst();
const disposeSecond=load('/second.png'),second=mediaRef.current;
await resolveBytes(pending[0],stillPng);
assert.equal(first.gridAnimated,true,'stale async result cannot update a disposed source');
assert.equal(second.gridAnimated,true,'stale result cannot classify replacement media');
await resolveBytes(pending[1],stillPng);
assert.equal(second.gridAnimated,false,'current PNG enables static stage caching');
disposeSecond();
const disposeThird=load('/unreadable.png'),third=mediaRef.current;
pending[2].reject(new Error('unavailable'));
for(let i=0;i<5;i++)await Promise.resolve();
assert.equal(third.gridAnimated,true,'failed reads preserve live-image behavior');
disposeThird();
console.log('Image animation passed: still PNG/WebP/JPEG/BMP, APNG/WebP animation, conservative malformed/unknown inputs, source classification and disposal.');
