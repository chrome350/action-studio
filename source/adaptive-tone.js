const gridToneHistory=new WeakMap();
/** Frame-wide exposure; saturated blue/red retain perceived energy. */
export function gridAdaptiveTone(data,source=null,time=0) {
 const samples=[];let peak=0;
 for(let i=0;i<data.length;i+=16){const l=Math.sqrt(.299*data[i]**2+.587*data[i+1]**2+.114*data[i+2]**2)/255*data[i+3]/255;peak=Math.max(peak,l);if(l>.012)samples.push(l)}
 samples.sort((a,b)=>a-b);
 const at=p=>samples.length?samples[Math.floor((samples.length-1)*p)]:0;
 let black=Math.min(.035,at(.08)*.25),white=Math.max(.12,at(.96));
 if(source?.tagName==='VIDEO'){
  const old=gridToneHistory.get(source),dt=old?time-old.time:0;
  if(old&&dt>=0&&dt<.7){const blend=1-Math.exp(-dt/.35);black=old.black+(black-old.black)*blend;white=old.white+(white-old.white)*blend}
  gridToneHistory.set(source,{black,white,time});
 }
 const clamp=v=>Math.max(0,Math.min(1,v));
 return {black,white,peak,high:white,low:black,
  tone:l=>Math.pow(clamp((l-black)/Math.max(.10,white-black)),.65),
  coverage:l=>{const t=clamp((l-Math.max(.008,black*.5))/Math.max(.012,white*.08));return t*t*(3-2*t)}};
}
export function gridLettersMask(data,profile,contrast=1,gamma=1){
 const out=new Uint8ClampedArray(data.length);
 for(let i=0;i<data.length;i+=4){const light=Math.sqrt(.299*data[i]**2+.587*data[i+1]**2+.114*data[i+2]**2)/255;
 const adjusted=Math.pow(Math.max(0,Math.min(1,(light-.5)*contrast+.5)),1/gamma);
 out[i]=out[i+1]=out[i+2]=255;out[i+3]=data[i+3]*profile.coverage(adjusted)}
 return out;
}
