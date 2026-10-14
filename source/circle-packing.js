/** Deterministic sparse packing in a foreground mask. No per-frame random seeds. */
export function renderCirclePacking(data,width,height,count=120) {
  const n=width*height,mask=new Uint8Array(n),distance=new Float32Array(n);
  for(let p=0;p<n;p++){
    const i=p*4;
    // Use colour magnitude so dark saturated petals remain part of the silhouette.
    mask[p]=Math.max(data[i],data[i+1],data[i+2])*data[i+3]/255>22?1:0;
    distance[p]=mask[p]?Math.min(p%width+1,width-p%width,Math.floor(p/width)+1,height-Math.floor(p/width)):0;
  }
  // Conservative chamfer distance bounds keep the whole stroke inside the mask.
  const diagonal=Math.SQRT2;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=y*width+x;if(!mask[p])continue;
    if(x)distance[p]=Math.min(distance[p],distance[p-1]+1);
    if(y)distance[p]=Math.min(distance[p],distance[p-width]+1);
    if(x&&y)distance[p]=Math.min(distance[p],distance[p-width-1]+diagonal);
    if(x+1<width&&y)distance[p]=Math.min(distance[p],distance[p-width+1]+diagonal);
  }
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
    const p=y*width+x;if(!mask[p])continue;
    if(x+1<width)distance[p]=Math.min(distance[p],distance[p+1]+1);
    if(y+1<height)distance[p]=Math.min(distance[p],distance[p+width]+1);
    if(x&&y+1<height)distance[p]=Math.min(distance[p],distance[p+width-1]+diagonal);
    if(x+1<width&&y+1<height)distance[p]=Math.min(distance[p],distance[p+width+1]+diagonal);
  }
  const stride=width+1,area=new Uint32Array(stride*(height+1));
  for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){row+=mask[y*width+x];area[(y+1)*stride+x+1]=area[y*stride+x+1]+row;}}
  const support=(x,y)=>{const r=18,x0=Math.max(0,x-r),x1=Math.min(width,x+r),y0=Math.max(0,y-r),y1=Math.min(height,y+r);return (area[y1*stride+x1]-area[y0*stride+x1]-area[y1*stride+x0]+area[y0*stride+x0])/((x1-x0)*(y1-y0));};
  const candidates=[];let maximum=0;
  for(let y=2;y<height-2;y+=3)for(let x=2;x<width-2;x+=3){
    const r=Math.max(0,distance[y*width+x]*.90-1.1);
    if(r>=2.2){candidates.push({x:x+.5,y:y+.5,r});maximum=Math.max(maximum,r);}
  }
  const circles=[],target=Math.max(16,Math.min(160,Math.round(count))),gap=1.5;
  const hash=(x,y)=>{const v=Math.sin(x*12.9898+y*78.233)*43758.5453;return v-Math.floor(v)};
  function place(limit,minRadius,maxRadius,narrow=false){
    for(let k=0;k<limit;k++){
      let best=null,score=-1;
      for(const c of candidates){
        if(narrow&&c.r>maximum*.10)continue;
        if(narrow){
          if(support(Math.floor(c.x),Math.floor(c.y))>.42)continue;
          const ix=Math.floor(c.x),iy=Math.floor(c.y),p=iy*width+ix,d=distance[p];
          const ridgeX=d>=distance[p-1]&&d>=distance[p+1];
          const ridgeY=d>=distance[p-width]&&d>=distance[p+width];
          if(!ridgeX&&!ridgeY)continue;
        }
        let r=Math.min(c.r,maxRadius*(.76+.24*hash(c.x,c.y))),free=maximum*2;
        for(const other of circles){const clearance=Math.hypot(c.x-other.x,c.y-other.y)-other.r-gap;free=Math.min(free,clearance);r=Math.min(r,clearance);}
        if(r<minRadius)continue;
        // Small circles are selected sparsely; no automatic filling of contour gaps.
        if(narrow&&circles.some(o=>o.narrow&&Math.hypot(c.x-o.x,c.y-o.y)<Math.max(11,(r+o.r)*1.45)))continue;
        const value=r*Math.pow(Math.max(1,Math.min(45,free)),.35)*(.94+.06*hash(c.x+7,c.y));
        if(value>score){score=value;best={x:c.x,y:c.y,r,narrow};}
      }
      if(!best)break;circles.push(best);
    }
  }
  place(4,maximum*.30,maximum*.54);
  place(Math.round(target*.20),2.2,Math.max(3,maximum*.10),true);
  place(Math.round(target*.40),Math.max(4,maximum*.10),maximum*.32);
  place(Math.max(0,target-circles.length),2.2,maximum*.18);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#000000';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#C6C9CE';ctx.lineWidth=.8;
  for(const c of circles){ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.stroke();}
  canvas.packingCircles=circles;
  return canvas;
}
