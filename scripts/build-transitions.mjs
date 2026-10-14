import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const capture=`function captureEffectFade(index){if(!Be.current||!H.current)return;const old=H.current,frame=document.createElement("canvas");frame.width=frame.height=600;const ctx=frame.getContext("2d");ctx.drawImage(Be.current,0,0);if(getComputedStyle(old).visibility!=="hidden"){ctx.globalAlpha=Number(getComputedStyle(old).opacity);ctx.drawImage(old,0,0);ctx.globalAlpha=1}const overlay=old.getContext("2d");overlay.clearRect(0,0,600,600);if(index===undefined)overlay.drawImage(frame,0,0);else{const left=Math.round(index%f*600/f),top=Math.round(Math.floor(index/f)*600/s),right=Math.round((index%f+1)*600/f),bottom=Math.round((Math.floor(index/f)+1)*600/s);overlay.drawImage(frame,left,top,right-left,bottom-top,left,top,right-left,bottom-top)}L(value=>value+1)}`;
function replace(s,a,b){if(!s.includes(a))throw Error('Missing fade hook '+a);return s.replace(a,b)}
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 s=s.replace('[f,r]=O.useState(4),[s,h]=O.useState(4)','[f,r]=O.useState(6),[s,h]=O.useState(6)').replace('w({}),r(4),h(4)','w({}),r(6),h(6)');
 if(!s.includes('function captureEffectFade(')){
 s=replace(s,'function Bt(previous,cells,index)',capture+'function Bt(previous,cells,index)');
 s=replace(s,'if(Et.current=(Rt+1)%bt.length,Be.current&&H.current){const Me=H.current.getContext("2d");Me?.clearRect(0,0,600,600),Me?.drawImage(Be.current,0,0),L(qe=>qe+1)}','Et.current=(Rt+1)%bt.length;captureEffectFade(oe);');
 s=replace(s,'L(0),w(at),Et.current=0','captureEffectFade(),w(at),Et.current=0');
 s=replace(s,'if(at.mode&&(tt(at.mode),et||w({}))','if(at.mode&&(captureEffectFade(),tt(at.mode),et||w({}))');
 s=replace(s,'visibility:et&&R>0?"visible":"hidden"','visibility:R>0?"visible":"hidden"');
 s=replace(s,'animationPlayState:st||!dt?"paused":"running"','animationPlayState:st?"paused":"running"');
 s=replace(s,'O.useEffect(()=>{let at=0,bt=null,Rt=!1,oe=null,Me=null','O.useLayoutEffect(()=>{let at=0,bt=null,Rt=!1,oe=null,Me=null');
 s=s.replace('et&&R>0&&H.current','R>0&&H.current');
 }
 s=s.replace('animation-duration:.45s','animation-duration:.7s');
 await fs.writeFile(file,s);
}
const css=new URL('assets/index-DlFOVRFE.css',root);await fs.writeFile(css,(await fs.readFile(css,'utf8')).replace('animation-duration:.45s','animation-duration:.7s'));
console.log('6 × 6 default and synchronized cell crossfades updated.');
