/** One source-wide colour field shared by all Letters cells. */
export function lettersColorField(data,width,height,colors,profile=null) {
  const stops=colors.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
  let low=1,high=0;
  for(let y=2;y<height;y+=4)for(let x=2;x<width;x+=4){
    const i=(y*width+x)*4;
    const light=Math.sqrt(.299*data[i]**2+.587*data[i+1]**2+.114*data[i+2]**2)/255*data[i+3]/255;
    if(light>.08){const t=(x/width+y/height)/2;low=Math.min(low,t);high=Math.max(high,t)}
  }
  if(high<low){low=0;high=1}
  const field=(x,y,light=1)=>{
    const t=Math.max(0,Math.min(1,((x/width+y/height)/2-low)/Math.max(.01,high-low)))*(stops.length-1);
    const a=Math.floor(t),b=Math.min(stops.length-1,a+1),mix=t-a;
    // Keep luminance structure without turning coloured lettering grey.
    const gain=profile?profile.tone(light):Math.pow(Math.max(0,Math.min(1,light)),.65);
    return `rgb(${stops[a].map((v,c)=>Math.round((v+(stops[b][c]-v)*mix)*gain)).join(',')})`;
  };
  field.profile=profile;
  return field;
}
