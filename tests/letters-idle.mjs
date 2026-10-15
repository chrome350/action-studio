import assert from 'node:assert/strict';
import {createLettersInteraction,drawLettersInteraction} from '../source/letters-interaction.js';

const image={width:17,height:13,pixels:new Uint8ClampedArray(17*13*4)};
for(let i=0;i<image.pixels.length;i++)image.pixels[i]=(i*37)%256;
const cell={image,x:2,y:3,background:'#000',completeTiles:true,tiles:[]};
for(let top=0;top<image.height;top+=4)for(let left=0;left<image.width;left+=5)cell.tiles.push({left,top,w:Math.min(5,image.width-left),h:Math.min(4,image.height-top),anchorX:cell.x+left,anchorY:cell.y+top,ox:0,oy:0,vx:0,vy:0});
function recorder(){
 const output=new Uint8ClampedArray(24*20*4),calls=[];
 return {output,calls,save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){output.fill(0)},drawImage(source,...args){
  calls.push(args);
  const [sx,sy,sw,sh,dx,dy]=args.length===2?[0,0,source.width,source.height,...args]:args;
  // The idle path and the original integer tile path address identical source
  // pixels. Copying the full RGBA checks transparent as well as coloured pixels.
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
   const from=((sy+y)*source.width+sx+x)*4,to=((dy+y)*24+dx+x)*4;
   output.set(source.pixels.subarray(from,from+4),to);
  }
 }};
}
const reference=recorder();
for(const tile of cell.tiles)reference.drawImage(image,tile.left,tile.top,tile.w,tile.h,cell.x+tile.left,cell.y+tile.top,tile.w,tile.h);
const state=createLettersInteraction();state.cells=[cell];state.fullFrameLetters=true;
for(const [enabled,reduced,pointer] of [[true,false,null],[false,false,null],[true,true,{x:3,y:4}],[true,false,{x:1000,y:1000}]]){
 state.pointer=pointer;
 const target=recorder();
 drawLettersInteraction(target,state,enabled,30,45,reduced,16);
 assert.equal(target.calls.length,1,'An idle complete cell is drawn once');
 assert.deepEqual(target.output,reference.output,'A full bitmap addresses exactly the same RGBA as its integer tiles');
 assert(cell.tiles.every(tile=>tile.ox===0&&tile.oy===0));
}
for(const fullFrameLetters of [false,undefined]){
 state.fullFrameLetters=fullFrameLetters;state.pointer=null;
 const target=recorder();
 drawLettersInteraction(target,state,true,30,45,false,16);
 assert.equal(target.calls.length,cell.tiles.length,'Mixed and unknown scenes preserve individual tile blending');
 assert.deepEqual(target.output,reference.output);
}
state.fullFrameLetters=true;
state.pointer={x:5,y:5};
const moving=recorder();
// Pixel addressing is irrelevant for moving, fractional tiles in this check.
moving.drawImage=(...args)=>moving.calls.push(args);
drawLettersInteraction(moving,state,true,30,45,false,32);
assert.equal(moving.calls.length,cell.tiles.length,'Displaced letters retain the original individual tile draw');
assert(cell.tiles.some(tile=>tile.ox!==0||tile.oy!==0));
const frozen=recorder();frozen.drawImage=(...args)=>frozen.calls.push(args);
const offsets=cell.tiles.map(tile=>[tile.ox,tile.oy,tile.vx,tile.vy]);
drawLettersInteraction(frozen,state,true,30,45,false,48,true,true);
assert.deepEqual(cell.tiles.map(tile=>[tile.ox,tile.oy,tile.vx,tile.vy]),offsets,'Frozen displaced letters preserve their state');
assert.equal(frozen.calls.length,cell.tiles.length);
console.log('Letters idle: full-frame fast path, mixed tile blending, identical pixel addressing, moving and frozen tiles preserved.');
