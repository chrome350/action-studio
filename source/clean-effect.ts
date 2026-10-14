/** Confа’26 light treatment. All distances are in the 600 px working canvas. */
export const PRESETS = [
  { name: 'Светлый', ink: '#07080B', paper: '#FFFFFF' },
  { name: 'Оранжевый', ink: '#07080B', paper: '#FF6E14' },
  { name: 'Голубой', ink: '#07080B', paper: '#34A4FA' },
  { name: 'Синий', ink: '#07080B', paper: '#3E6BFF' },
];

type BlurPlane = (data: Uint8ClampedArray, width: number, height: number, radius: number) => Uint8ClampedArray;
type Glow = { image: HTMLCanvasElement };
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x-a)/(b-a)); return t*t*(3-2*t); };
const rgb = (hex: string) => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));

// The underlying cell remains a colour image; the cached F3 image replaces Action cells.
export function applyBase(data: Uint8ClampedArray, ink: string, contrast: number, gamma: number) {
  const bg = rgb(ink);
  for (let i=0;i<data.length;i+=4) {
    const l=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;
    const gain=l>.001 ? Math.pow(clamp((l-.5)*contrast+.5),1/gamma)/l : 0;
    const coverage=smooth(.008,.045,Math.max(data[i],data[i+1],data[i+2])/255);
    for(let c=0;c<3;c++) data[i+c]=bg[c]*(1-coverage)+Math.min(255,data[i+c]*gain)*coverage;
  }
}

/** F3: chromatic radial stretch, coloured light fields, then red shadow grading.
 * Prepared once per settings change; draw/export reuse the same finished image.
 */
export function prepare(data: Uint8ClampedArray, width: number, height: number, radius: number,
 contrast: number, gamma: number, blur: BlurPlane, accent='#FFFFFF', ink='#07080B',
 intensity=80, trail=16, sourceWidth=width, sourceHeight=height, clarity=16): Glow {
  const fit=Math.min(width/sourceWidth,height/sourceHeight);
  const sw=sourceWidth*fit,sh=sourceHeight*fit,ox=(width-sw)/2,oy=(height-sh)/2;
  const cx=ox+sw*.5,cy=oy+sh*.45,unit=sw/754;
  const size=Math.max(0,radius/24),strength=Math.max(0,intensity/80);
  const clearRadius=clamp(clarity/100);
  const split=.095*size*strength,streak=.12*(trail/16)*strength;
  const bg=rgb(ink),pixels=new Float32Array(data.length),result=new Uint8ClampedArray(data.length);
  for(let i=0;i<data.length;i+=4){
    const l=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;
    const gain=l>.001?Math.pow(clamp((l-.5)*contrast+.5),1/gamma)/l:0;
    for(let c=0;c<3;c++)pixels[i+c]=Math.min(255,data[i+c]*gain)*data[i+3]/255;
    pixels[i+3]=data[i+3];
  }
  const sample=(x:number,y:number,c:number)=>{
    if(x<0||y<0||x>width-1||y>height-1)return 0;
    const ix=Math.floor(x),iy=Math.floor(y),jx=Math.min(width-1,ix+1),jy=Math.min(height-1,iy+1),fx=x-ix,fy=y-iy;
    return (pixels[(iy*width+ix)*4+c]*(1-fx)+pixels[(iy*width+jx)*4+c]*fx)*(1-fy)+(pixels[(jy*width+ix)*4+c]*(1-fx)+pixels[(jy*width+jx)*4+c]*fx)*fy;
  };
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const dx=x-cx,dy=y-cy,r=Math.hypot(dx/(sw*.4),dy/(sh*.49)),gate=smooth(clearRadius,clearRadius+.59,r),i=(y*width+x)*4;
    const phase=Math.sin(Math.atan2(dy,dx)*3+.4)*.18+1;
    for(let c=0;c<3;c++){
      const scale=1+split*gate*(c===0?-.14:c===1?.40:1);let sum=0,weight=0;
      for(let k=0;k<7;k++){const t=k/6,s=scale+t*streak*gate*phase,wt=k===0?3:1-t*.65;sum+=sample(cx+dx/s,cy+dy/s,c)*wt;weight+=wt;}
      const blend=gate*.95;
      result[i+c]=Math.min(255,(pixels[i+c]*(1-blend)+sum/weight*blend)*(1+.08*Math.min(1,strength)));
    }
    result[i+3]=255;
  }
  const screen=(i:number,c:number,light:number,alpha:number)=>{result[i+c]=255-(255-result[i+c])*(1-light/255*clamp(alpha));};
  // Bloom of the stretched RGB image. CPU blur works in Safari and offline mode.
  const deformed=result.slice();
  for(const [r,a] of [[8,.6],[2,.35]])for(let c=0;c<3;c++){
    const plane=new Uint8ClampedArray(width*height);
    for(let p=0;p<plane.length;p++){const i=p*4,peak=Math.max(deformed[i],deformed[i+1],deformed[i+2])/255;plane[p]=deformed[i+c]*smooth(.22,.8,peak)*150/255;}
    const spread=blur(plane,width,height,r*unit*size);
    for(let p=0;p<plane.length;p++)screen(p*4,c,spread[p],a*strength);
  }
  const lit=result.slice(),tint=accent.toUpperCase()==='#FFFFFF'?null:rgb(accent);
  const fields=[
    {color:[255,63,9],radius:15,dx:12,dy:3,gain:1.2,kind:'warm'},
    {color:[12,28,255],radius:22,dx:-6,dy:-8,gain:1.05,kind:'blue'},
    {color:[0,245,255],radius:7,dx:-4,dy:-10,gain:.70,kind:'cyan'},
  ];
  for(const field of fields){
    const seed=new Uint8ClampedArray(width*height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4,peak=Math.max(lit[i],lit[i+1],lit[i+2])/255;
      const right=smooth(ox+240*unit,ox+520*unit,x),upper=1-smooth(oy+190*unit,oy+400*unit,y);
      const zone=field.kind==='warm'?.20+.80*right:field.kind==='blue'?.35+.65*upper:upper*(.9-.4*right);
      seed[y*width+x]=255*smooth(.25,.82,peak)*zone;
    }
    const spread=blur(seed,width,height,field.radius*unit*size),color=tint||field.color;
    const dx=Math.round(field.dx*unit*size),dy=Math.round(field.dy*unit*size);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const sx=x-dx,sy=y-dy;if(sx<0||sy<0||sx>=width||sy>=height)continue;
      const i=(y*width+x)*4,peak=Math.max(lit[i],lit[i+1],lit[i+2])/255,inside=smooth(.04,.22,peak);
      const warmth=smooth(.025,.16,(lit[i]-lit[i+2])/255);
      const protect=(1-.90*smooth(.65,1,peak))*(1-.65*inside)*(field.kind==='warm'?1:1-.8*warmth);
      const alpha=spread[sy*width+sx]/255*protect*field.gain*strength;
      for(let c=0;c<3;c++)screen(i,c,color[c],alpha);
    }
  }
  for(let i=0;i<result.length;i+=4){
    const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255,l=.2126*r+.7152*g+.0722*b;
    const shadow=smooth(.015,.14,l)*(1-smooth(.48,.84,l));
    const warmth=smooth(.015,.15,r-b),cold=smooth(.06,.3,(result[i+2]-result[i])/255);
    const amount=shadow*(data[i+3]/255)*(.38+.62*warmth)*(1-.72*cold)*Math.min(strength,1.5);
    result[i]+=(255-result[i])*.56*amount;result[i+1]*=1-.13*amount;result[i+2]*=1-.24*amount;
    // Screen the image over the selected background without cutting holes in dark material.
    for(let c=0;c<3;c++)result[i+c]=255-(255-bg[c])*(1-result[i+c]/255);
  }
  const image=document.createElement('canvas');image.width=width;image.height=height;
  const context=image.getContext('2d')!,frame=context.createImageData(width,height);frame.data.set(result);context.putImageData(frame,0,0);
  return {image};
}
export function draw(ctx:CanvasRenderingContext2D,glow:Glow,_time:number,_intensity:number,_trail:number){
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.drawImage(glow.image,0,0);ctx.restore();
}
