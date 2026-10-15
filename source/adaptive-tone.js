const gridToneHistory=new WeakMap();
// Select the exact sorted rank without sorting the whole frame. A three-way
// partition also finishes in one pass for flat/duplicate-heavy images.
function gridToneSelect(values,index,left=0,right=values.length-1) {
 let budget=2*Math.ceil(Math.log2(right-left+2));
 while(left<right){
  if(--budget<0){const rest=values.slice(left,right+1).sort((a,b)=>a-b);for(let i=0;i<rest.length;i++)values[left+i]=rest[i];return values[index]}
  const middle=(left+right)>>>1,a=values[left],b=values[middle],c=values[right];
  const pivot=a<b?(b<c?b:a<c?c:a):(a<c?a:b<c?c:b);
  let low=left,scan=left,high=right;
  while(scan<=high){
   const value=values[scan];
   if(value<pivot){values[scan]=values[low];values[low++]=value;scan++}
   else if(value>pivot){values[scan]=values[high];values[high--]=value}
   else scan++;
  }
  if(index<low)right=low-1;
  else if(index>high)left=high+1;
  else return values[index];
 }
 return values[left];
}
/** Frame-wide exposure; saturated blue/red retain perceived energy. */
export function gridAdaptiveTone(data,source=null,time=0) {
 const samples=[];let peak=0;
 for(let i=0;i<data.length;i+=16){const l=Math.sqrt(.299*data[i]**2+.587*data[i+1]**2+.114*data[i+2]**2)/255*data[i+3]/255;peak=Math.max(peak,l);if(l>.012)samples.push(l)}
 const lowIndex=Math.floor((samples.length-1)*.08),highIndex=Math.floor((samples.length-1)*.96);
 const low=samples.length?gridToneSelect(samples,lowIndex):0;
 const high=samples.length?(highIndex===lowIndex?low:gridToneSelect(samples,highIndex,lowIndex+1)):0;
 let black=Math.min(.035,low*.25),white=Math.max(.12,high);
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
