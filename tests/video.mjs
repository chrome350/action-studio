import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {videoTime,videoMime} from '../source/video.js';
assert.equal(videoTime(NaN),'0:00');assert.equal(videoTime(65.8),'1:05');assert.equal(videoTime(3600),'60:00');
assert.equal(videoMime(null),'');
assert.equal(videoMime({isTypeSupported:type=>type==='video/webm'}),'video/webm');
assert.equal(videoMime({isTypeSupported:()=>false}),'');
assert.ok(videoMime({isTypeSupported:()=>true}).startsWith('video/mp4'));
for(const file of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const s=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');
 assert.equal(s.split('/* grid-video:start */').length,2);
 assert.ok(s.includes('accept:"image/*,video/*"'));
 assert.ok(s.includes('videoFrame=Je.currentTime;Rt=false;dotPrepared=null'),'video invalidates cached effects');
 assert.ok(s.includes('isVideo?source.currentTime:null'),'ribbons cache includes video time');
 const pauseGuard=s.match(/function cn\(\)\{if\((.*?)\)return;/)?.[1];
 assert.ok(pauseGuard,'playback toggle has an early guard');
 const guard=new Function('Ft','videoTools',`return (${pauseGuard})`);
 assert.equal(guard({current:{}},{isRecording:()=>true}),true,'space cannot interrupt recording');
 assert.equal(guard({current:{}},{isRecording:()=>false}),false,'space can toggle loaded media outside recording');
 assert.ok(s.includes('lettersMotion.current.previousCells=lettersMotion.current.cells'),'letter motion survives source frames');
}
console.log('Video: time, MIME negotiation, both builds, frame invalidation, ribbon and letter integration passed.');
