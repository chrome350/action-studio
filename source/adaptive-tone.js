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

/** Convert a light photographic backdrop into the zero-energy background expected
 * by every effect. Palette colours are applied later and are never inverted.
 * bounds describe the fitted/zoomed source, excluding black canvas letterboxing. */
export function gridForegroundForEffects(data,width,height,bounds=null,metadata=null){
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
 const left=Math.max(0,Math.min(width-1,Math.ceil(bounds?.left??0)));
 const top=Math.max(0,Math.min(height-1,Math.ceil(bounds?.top??0)));
 const right=Math.max(left,Math.min(width-1,Math.floor(bounds?.right??width-1)));
 const bottom=Math.max(top,Math.min(height-1,Math.floor(bounds?.bottom??height-1)));
 // Ignore narrow scanner/export frames when measuring the photographic backdrop.
 const inset=Math.max(1,Math.floor(Math.min(right-left+1,bottom-top+1)*.018));
 const probeLeft=Math.min(right,left+inset),probeRight=Math.max(probeLeft,right-inset),probeTop=Math.min(bottom,top+inset),probeBottom=Math.max(probeTop,bottom-inset);
 const samples=[[],[],[]],border=[],positions=[];
 const add=(x,y)=>{const i=(y*width+x)*4;if(data[i+3]<240)return;const color=[data[i],data[i+1],data[i+2]];border.push(color);positions.push([x,y]);for(let c=0;c<3;c++)samples[c].push(color[c])};
 const step=Math.max(1,Math.floor(Math.max(right-left,bottom-top)/180));
 for(let x=left;x<=right;x+=step){add(x,probeTop);add(x,probeBottom)}
 for(let y=top;y<=bottom;y+=step){add(probeLeft,y);add(probeRight,y)}
 if(border.length<4)return data;
 const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
 const bg=samples.map(median),light=(.2126*bg[0]+.7152*bg[1]+.0722*bg[2])/255;
 const consistent=border.filter(color=>Math.max(...color.map((v,c)=>Math.abs(v-bg[c])))<48).length/border.length;
 // Conservative polarity decision: preserve dark imagery byte-for-byte.
 const borderLights=border.map(color=>(.2126*color[0]+.7152*color[1]+.0722*color[2])/255).sort((a,b)=>a-b);
 const flatBackdrop=border.filter(color=>Math.max(...color.map((v,c)=>Math.abs(v-bg[c])))<4).length/border.length>.95;
 const brightEdge=borderLights[Math.floor((borderLights.length-1)*.85)];

 const patch=Math.max(1,Math.min(probeRight-probeLeft+1,probeBottom-probeTop+1,Math.floor(Math.min(right-left+1,bottom-top+1)*.025)));
 const corner=(cx,cy,dx,dy)=>[0,1,2].map(c=>{const values=[];for(let y=0;y<patch;y++)for(let x=0;x<patch;x++)values.push(data[((cy+y*dy)*width+cx+x*dx)*4+c]);return median(values)});
 const corners=[corner(probeLeft,probeTop,1,1),corner(probeRight,probeTop,-1,1),corner(probeLeft,probeBottom,1,-1),corner(probeRight,probeBottom,-1,-1)];
 if(light<.55 && !(light>.32 && brightEdge>.65))return data;
 if(consistent<.55){
   const errors=border.map((color,index)=>{
     const [x,y]=positions[index],tx=clamp((x-probeLeft)/Math.max(1,probeRight-probeLeft)),ty=clamp((y-probeTop)/Math.max(1,probeBottom-probeTop));
     return Math.max(...color.map((value,c)=>Math.abs(value-((corners[0][c]*(1-tx)+corners[1][c]*tx)*(1-ty)+(corners[2][c]*(1-tx)+corners[3][c]*tx)*ty))));
   }).sort((a,b)=>a-b);
   if(errors[Math.floor(errors.length*.75)]>24)return data;
 }
 const horizontal=[probeTop,probeBottom].map(row=>Array.from({length:width},(_,x)=>[0,1,2].map(c=>{const values=[];for(let dx=-3;dx<=3;dx++)values.push(data[(row*width+Math.max(left,Math.min(right,x+dx)))*4+c]);return median(values)})));
 const backdrop=metadata?new Uint8ClampedArray(data.length):null;
 const out=new Uint8ClampedArray(data.length);
 for(let y=0;y<height;y++){
  const edge=x=>[0,1,2].map(c=>{const values=[];for(let dy=-3;dy<=3;dy++)values.push(data[(Math.max(top,Math.min(bottom,y+dy))*width+x)*4+c]);return median(values)});
  const fy=clamp((y-top)/Math.max(1,bottom-top));
  const predicted=[0,1].map(side=>corners[side].map((v,c)=>v*(1-fy)+corners[side+2][c]*fy));
  const edges=[edge(probeLeft),edge(probeRight)];
  const [a,b]=edges.map((color,side)=>{const distance=Math.max(...color.map((v,c)=>Math.abs(v-predicted[side][c]))),weight=1-smooth(24,64,distance);return color.map((v,c)=>v*weight+predicted[side][c]*(1-weight))});
  for(let x=0;x<width;x++){
   const i=(y*width+x)*4;out[i+3]=data[i+3];
   if(x<left||x>right||y<top||y>bottom){out[i+3]=0;if(backdrop)backdrop.set([...bg,255],i);continue;}
   const t=(x-left)/Math.max(1,right-left);
   const background=flatBackdrop?bg:a.map((v,c)=>{
    const bilinear=predicted[0][c]*(1-t)+predicted[1][c]*t;
    const topExpected=corners[0][c]*(1-t)+corners[1][c]*t,bottomExpected=corners[2][c]*(1-t)+corners[3][c]*t;
    const upper=horizontal[0][x][c],lower=horizontal[1][x][c];
    const vertical=(Math.abs(upper-topExpected)<64?upper:topExpected)*(1-fy)+(Math.abs(lower-bottomExpected)<64?lower:bottomExpected)*fy;
    return Math.max(0,Math.min(255,v*(1-t)+b[c]*t+vertical-bilinear));
   });
   if(backdrop)backdrop.set([...background,255],i);
   const delta=Math.max(...background.map((v,c)=>Math.abs(data[i+c]-v)/Math.max(128,v,255-v)));
   const coverage=smooth(.008,.065,delta)*data[i+3]/255;
   out[i+3]=Math.round(255*coverage);
   const energy=coverage>0?Math.pow(clamp(delta),.60):0;
   const peak=Math.max(data[i],data[i+1],data[i+2]),low=Math.min(data[i],data[i+1],data[i+2]);
   // Neutral black details become bright signal; chromatic detail retains hue.
   const saturation=(peak-low)/Math.max(1,peak),retain=smooth(.08,.35,saturation);
   for(let c=0;c<3;c++)out[i+c]=255*energy*((1-retain)+retain*data[i+c]/Math.max(1,peak));
  }
 }
 if(metadata){metadata.background=backdrop;metadata.lightMode=light>=.55||(light>.32&&brightEdge>.65);}
 return out;
}
