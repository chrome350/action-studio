/** Continuous local surface stretch. Mask is in image coordinates.
 * Background inference is deliberately conservative: unselected foreground pixels remain
 * byte-identical; the painted edge deforms continuously. Best suited to a subject on a uniform background.
 */
function nearestRibbonCoordinate(values,value) {
  let low=0,high=values.length;
  while(low<high){const middle=(low+high)>>>1;if(values[middle]<value)low=middle+1;else high=middle;}
  if(!low)return values[0];
  if(low===values.length)return values[low-1];
  // The original ascending reduce kept the smaller coordinate on equal distance.
  return value-values[low-1]<=values[low]-value?values[low-1]:values[low];
}
export function ribbonPixels(data, width, height, length=75, capture=8, bend=30, direction='left', mask=null) {
  const out=new Uint8ClampedArray(data);
  if(!mask || !length || !mask.some(v=>v)) return out;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
  // Feather inward only: pixels outside the painted region stay exact.
  const distance=new Float32Array(width*height);
  for(let p=0;p<distance.length;p++)distance[p]=mask[p]>8?width+height:0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=y*width+x;if(distance[p])distance[p]=Math.min(distance[p],x?distance[p-1]+1:1,y?distance[p-width]+1:1)}
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const p=y*width+x;if(distance[p])distance[p]=Math.min(distance[p],x<width-1?distance[p+1]+1:1,y<height-1?distance[p+width]+1:1)}
  const sign=direction==='right'?1:-1;
  const reach=Math.max(1,width*clamp(length,0,100)/100);
  const band=Math.max(1,capture*width/600);
  // Robust border colour, ignoring isolated stems that reach the frame edge.
  const channels=[[],[],[]];
  for(let y=0;y<height;y++)for(const x of [0,width-1])for(let c=0;c<3;c++)channels[c].push(data[(y*width+x)*4+c]);
  for(let x=0;x<width;x++)for(const y of [0,height-1])for(let c=0;c<3;c++)channels[c].push(data[(y*width+x)*4+c]);
  const bg=channels.map(a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)]);
  const foreground=new Float32Array(width*height);
  for(let p=0;p<foreground.length;p++) {
    const i=p*4, delta=Math.max(Math.abs(data[i]-bg[0]),Math.abs(data[i+1]-bg[1]),Math.abs(data[i+2]-bg[2]));
    foreground[p]=smooth((delta-4)/18)*(data[i+3]/255);
  }
  // Work in an oriented coordinate system: the ribbon always extends toward
  // decreasing u. The inner seam lies INSIDE the painted petal.
  const flip=sign>0;
  const pixel=(u,y)=>y*width+(flip?width-1-u:u);
  // Connected painted patches own separate surfaces, even at the same height.
  const visited=new Uint8Array(width*height),surfaces=[];
  for(let seed=0;seed<mask.length;seed++) {
    if(visited[seed] || mask[seed]<=8)continue;
    const queue=[seed];visited[seed]=1;
    const rows=new Map();
    for(let q=0;q<queue.length;q++) {
      const p=queue[q],x=p%width,y=Math.floor(p/width),u=flip?width-1-x:x;
      if(foreground[p]>.35){const row=rows.get(y)||[];row.push(u);rows.set(y,row)}
      for(const n of [x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1])if(n>=0&&!visited[n]&&mask[n]>8){visited[n]=1;queue.push(n)}
    }
    const ys=[...rows.keys()].sort((a,b)=>a-b);if(ys.length<2)continue;
    const top=ys[0],bottom=ys[ys.length-1],raw=new Map();
    for(const y of ys){const xs=rows.get(y).sort((a,b)=>a-b),edge=xs[Math.floor((xs.length-1)*.08)],inner=xs[xs.length-1];raw.set(y,[edge+Math.min(inner-edge,Math.max(2,band)),Math.max(1,Math.min(inner-edge,Math.max(2,band)))])}
    // Fit a continuous boundary across the entire patch, bridging source holes
    // rather than turning each missing scanline into an infinitely long slit.
    const filled=[];let j=0;
    for(let y=top;y<=bottom;y++){
      while(j<ys.length-2&&ys[j+1]<y)j++;
      const ya=ys[j],yb=ys[Math.min(j+1,ys.length-1)],t=yb===ya?0:clamp((y-ya)/(yb-ya),0,1),pa=raw.get(ya),pb=raw.get(yb);
      filled.push([pa[0]*(1-t)+pb[0]*t,pa[1]*(1-t)+pb[1]*t]);
    }
    const radius=Math.max(2,Math.round(height*.012)),fitted=[];
    for(let i=0;i<filled.length;i++){
      let weight=0,a=0,b=0;
      for(let k=-radius;k<=radius;k++){const w=radius+1-Math.abs(k),p=filled[clamp(i+k,0,filled.length-1)];a+=p[0]*w;b+=p[1]*w;weight+=w}
      fitted.push([a/weight,b/weight]);
    }
    surfaces.push({top,bottom,fitted,ys,rows});
  }
  const sample=(x,y)=>{
    x=clamp(x,0,width-1);y=clamp(y,0,height-1);
    const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
    let red=0,green=0,blue=0,alpha=0;
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
      const i=(Math.min(height-1,y0+dy)*width+Math.min(width-1,x0+dx))*4;
      const w=(dx?fx:1-fx)*(dy?fy:1-fy)*data[i+3]/255;
      alpha+=w;red+=data[i]*w;green+=data[i+1]*w;blue+=data[i+2]*w;
    }
    return [alpha?red/alpha:0,alpha?green/alpha:0,alpha?blue/alpha:0,alpha];
  };
  for(const surface of surfaces) {
  const {top,bottom,fitted}=surface;
  const center=(top+bottom)/2,span=Math.max(2,bottom-top);
  let count=0,sumU=0,sumY=0,sumUU=0,sumUY=0;
  for(const [y,xs] of surface.rows)for(const u of xs){count++;sumU+=u;sumY+=y;sumUU+=u*u;sumUY+=u*y}
  const heading=clamp(-(sumUY-sumU*sumY/count)/Math.max(1,sumUU-sumU*sumU/count),-.65,.65);
  // Outside all possible seams/reaches a pixel cannot belong to this surface.
  // The extra pixel on each side also covers Float64 interpolation rounding.
  let minimumEdge=Infinity,maximumEdge=-Infinity;
  for(const row of fitted){minimumEdge=Math.min(minimumEdge,row[0]-row[1]);maximumEdge=Math.max(maximumEdge,row[0]);}
  const firstU=Math.max(0,Math.floor(minimumEdge-reach)-1),lastU=Math.min(width-1,Math.ceil(maximumEdge)+1);
  function profile(y) {
    // Clamp during inversion, then test the solved coordinate. An output pixel
    // outside the original patch may belong to its bent surface.
    const v=clamp(y-top,0,fitted.length-1),a=Math.floor(v),b=Math.min(fitted.length-1,a+1),t=v-a;
    return [fitted[a][0]*(1-t)+fitted[b][0]*t,fitted[a][1]*(1-t)+fitted[b][1]*t,1];
  }
  for(let y=0;y<height;y++)for(let u=firstU;u<=lastU;u++) {
    const dest=pixel(u,y),selected=mask[dest]/255*smooth(distance[dest]/Math.max(1,width*.012));
    // Unpainted object pixels (including centre and stems) remain exact.
    if(foreground[dest]>=1 && !selected)continue;
    let sy=y,pr=null,d=0;
    // Inverse surface mapping avoids gaps and duplicated horizontal rows.
    for(let iteration=0;iteration<8;iteration++) {
      pr=profile(sy);d=pr[0]-u;if(d<=0)break;
      const q=d/Math.max(1,width*.14),ease=1-Math.exp(-q*q);
      const turn=bend/100;
      // A connected cross-section narrows, opens, and settles into a ribbon.
      const breadth=1+turn*(-.30*Math.exp(-(((q-.85)/.55)**2))+.22*Math.exp(-(((q-2)/.85)**2)))*ease;
      const drift=turn*(heading*width*.14*(1-Math.exp(-q))*ease+span*.13*Math.sin(q*1.6)*Math.exp(-q*.65)*ease);
      const curl=turn*span*.055*Math.sin((sy-top)/span*Math.PI*2)*ease*Math.exp(-q*.4);
      const next=center+(y-center-drift-curl)/breadth;
      sy=sy*.2+next*.8;
    }
    pr=profile(sy);if(sy<top || sy>bottom)continue;
    d=pr[0]-u;if(d<=0 || d>reach+pr[1])continue;
    // Unit derivative at the inner seam, progressively compressed toward the
    // outer edge: the original surface becomes the ribbon, without a cutout.
    const scale=pr[1]/Math.max(.05,Math.min(1,length/35));
    const sourceU=pr[0]-pr[1]*.85*(1-Math.exp(-d/(scale*.85)));
    // Reconstruct a connected texture strip from the selected surface.
    // Small foreground-aware sampling removes black-background contamination;
    // the original image itself is never blurred.
    // Interpolate fractional rows rather than rounding and averaging five rows:
    // retain fine colour lines without stair steps or a broad blur kernel.
    const color=[0,0,0,0],row0=Math.floor(sy),fraction=sy-row0;
    for(let oy=0;oy<2;oy++) {
      const ry=clamp(row0+oy,top,bottom);
      let validRow=ry;
      if(!surface.rows.has(validRow))validRow=nearestRibbonCoordinate(surface.ys,ry);
      const xs=surface.rows.get(validRow);
      const nearest=nearestRibbonCoordinate(xs,sourceU);
      const su=Math.abs(nearest-sourceU)>1?nearest:sourceU;
      const c=sample(flip?width-1-su:su,validRow),w=oy?fraction:1-fraction;
      for(let ch=0;ch<4;ch++)color[ch]+=c[ch]*w;
    }
    const transition=smooth(d/Math.max(1,pr[1]*.6));
    const endFade=smooth((reach+pr[1]-d)/Math.max(2,width*.025));
    const rim=smooth((sy-top)/2)*smooth((bottom-sy)/2);
    // Fade only the extended ribbon toward the canvas edge, preserving the join.
    const bright=Math.max(color[0],color[1],color[2])/255;
    const below=sample(flip?width-1-sourceU:sourceU,clamp(sy+height/300,0,height-1));
    const above=sample(flip?width-1-sourceU:sourceU,clamp(sy-height/300,0,height-1));
    const contrast=Math.max(Math.abs(color[0]-(above[0]+below[0])*.5),Math.abs(color[1]-(above[1]+below[1])*.5),Math.abs(color[2]-(above[2]+below[2])*.5))/255;
    const highlight=smooth((bright-.4)/.45)*smooth(contrast/.12);
    const progression=smooth(u/Math.max(1,pr[0]*.82));
    const edgeFade=.025+.975*Math.pow(progression,1-.65*highlight);
    const coverage=(1-foreground[dest]+foreground[dest]*selected)*rim*transition*endFade*edgeFade;
    if(!coverage)continue;
    // Broad folds change shading gently while source texture remains visible.
    const foldLight=1+.10*bend/100*Math.sin(sy/height*Math.PI*8.4)*Math.pow(1-Math.exp(-d/(width*.12)),2);
    const luminance=.2126*color[0]+.7152*color[1]+.0722*color[2];
    const saturation=1+.12*transition;
    for(let c=0;c<3;c++)color[c]=clamp(luminance+(color[c]-luminance)*saturation,0,255);
    const i=dest*4,sa=color[3]*coverage,da=data[i+3]/255,oa=sa+da*(1-sa);
    for(let c=0;c<3;c++)out[i+c]=oa?(color[c]*foldLight*sa+data[i+c]*da*(1-sa))/oa:0;
    out[i+3]=oa*255;
  }
  }
  return out;
}
// Keep source sampling on the caller's canvas; the expensive deformation itself
// consumes only these pixels and the scaled mask, so it can run in a worker.
export function prepareRibbonSource(data,width,height,mask,source=null,zoom=100,brightness=100) {
  const isVideo=source?.tagName==='VIDEO';
  // Render the deformation at 2x from the original upload, not an enlarged preview.
  const scale=isVideo?1:2,w=width*scale,h=height*scale;
  const high=document.createElement('canvas');high.width=w;high.height=h;
  const ctx=high.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
  if(source){
    ctx.save();ctx.translate(w/2,h/2);ctx.scale(zoom/100,zoom/100);ctx.translate(-w/2,-h/2);
    const fit=Math.min(w/source.naturalWidth,h/source.naturalHeight),sw=source.naturalWidth*fit,sh=source.naturalHeight*fit;
    ctx.drawImage(source,(w-sw)/2,(h-sh)/2,sw,sh);ctx.restore();
  }else{
    const small=document.createElement('canvas');small.width=width;small.height=height;
    small.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data),width,height),0,0);ctx.drawImage(small,0,0,w,h);
  }
  const hi=ctx.getImageData(0,0,w,h);
  if(source&&brightness!==100)for(let i=0;i<hi.data.length;i+=4)for(let c=0;c<3;c++)hi.data[i+c]*=brightness/100;
  const hm=new Uint8ClampedArray(w*h);
  if(mask)for(let y=0;y<h;y++)for(let x=0;x<w;x++)hm[y*w+x]=mask[Math.floor(y/scale)*width+Math.floor(x/scale)];
  return {width:w,height:h,rgba:hi.data,mask:hm};
}
export function renderRibbonStretch(data,width,height,length,capture,bend,direction,mask,source=null,zoom=100,brightness=100) {
  const isVideo=source?.tagName==='VIDEO';
  const key=[source,mask,width,height,length,capture,bend,direction,zoom,brightness,isVideo?source.currentTime:null];
  const cached=renderRibbonStretch.cache;
  if(source&&cached&&key.every((v,i)=>v===cached.key[i]))return cached.canvas;
  const prepared=prepareRibbonSource(data,width,height,mask,source,zoom,brightness);
  const w=prepared.width,h=prepared.height,hi={data:prepared.rgba},hm=prepared.mask;
  const high=document.createElement('canvas');high.width=w;high.height=h;
  const ctx=high.getContext('2d');
  ctx.putImageData(new ImageData(ribbonPixels(hi.data,w,h,length,capture,bend,direction,hm),w,h),0,0);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const preview=canvas.getContext('2d');preview.imageSmoothingEnabled=true;preview.imageSmoothingQuality='high';preview.drawImage(high,0,0,width,height);
  // The high-resolution render itself preserves unselected foreground.
  canvas.highResolution=high;
  if(source)renderRibbonStretch.cache={key,canvas};
  return canvas;
}
function drawRibbonExport(ctx,frame) {
  if(!frame)return;
  const {image,columns,rows,mode,cells,grid,color,opacity}=frame,n=ctx.canvas.width;
  ctx.save();ctx.beginPath();
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)if((cells[y*columns+x]?.mode||mode)==='ribbons'){
    const l=Math.round(x*600/columns),t=Math.round(y*600/rows),r=Math.round((x+1)*600/columns),b=Math.round((y+1)*600/rows);
    ctx.rect(l*n/600,t*n/600,(r-l)*n/600,(b-t)*n/600);
  }
  ctx.clip();ctx.drawImage(image,0,0,n,n);
  if(grid){ctx.fillStyle=color;ctx.globalAlpha=opacity/100;ctx.beginPath();
    for(let x=1;x<columns;x++)for(let y=.5;y<600;y+=8){const px=(Math.floor(x*600/columns)+.5)*n/600,py=y*n/600;ctx.moveTo(px+.5*n/600,py);ctx.arc(px,py,.5*n/600,0,Math.PI*2)}
    for(let y=1;y<rows;y++)for(let x=.5;x<600;x+=8){const px=x*n/600,py=(Math.floor(y*600/rows)+.5)*n/600;ctx.moveTo(px+.5*n/600,py);ctx.arc(px,py,.5*n/600,0,Math.PI*2)}
    ctx.fill();
  }ctx.restore();
}

/** Separate overlay is never part of the image or PNG export. */
function RibbonBrush({mask,onChange,size,erase,active,showMask=true}) {
  const ref=O.useRef(null),stroke=O.useRef(null);
  function draw(values) {
    const ctx=ref.current?.getContext('2d');if(!ctx)return;
    const image=ctx.createImageData(600,600);
    for(let p=0;p<values.length;p++){image.data[p*4]=255;image.data[p*4+1]=70;image.data[p*4+2]=170;image.data[p*4+3]=values[p]*.42}
    ctx.putImageData(image,0,0);
  }
  O.useEffect(()=>{draw(mask)},[mask,active]);
  function paint(e) {
    const current=stroke.current;if(!current || current.id!==e.pointerId)return;
    const box=ref.current.getBoundingClientRect(),x=(e.clientX-box.left)*600/box.width,y=(e.clientY-box.top)*600/box.height;
    const prev=current.point||[x,y],steps=Math.max(1,Math.ceil(Math.hypot(x-prev[0],y-prev[1])/Math.max(1,size/5))),r=size/2;
    for(let s=1;s<=steps;s++) {
      const cx=prev[0]+(x-prev[0])*s/steps,cy=prev[1]+(y-prev[1])*s/steps;
      for(let yy=Math.max(0,Math.floor(cy-r));yy<=Math.min(599,Math.ceil(cy+r));yy++)for(let xx=Math.max(0,Math.floor(cx-r));xx<=Math.min(599,Math.ceil(cx+r));xx++){
        const strength=Math.max(0,Math.min(1,(r-Math.hypot(xx-cx,yy-cy))/2));
        const p=yy*600+xx;current.mask[p]=erase?Math.min(current.mask[p],Math.round(255*(1-strength))):Math.max(current.mask[p],Math.round(255*strength));
      }
    }
    current.point=[x,y];draw(current.mask);e.preventDefault();
  }
  function finish(e){if(!stroke.current || stroke.current.id!==e.pointerId)return;const next=stroke.current.mask;stroke.current=null;onChange(next)}
  return U.jsx('canvas',{ref,width:600,height:600,'aria-label':'Кисть выбора края лепестка',style:{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:5,touchAction:active?'none':'auto',pointerEvents:active?'auto':'none',visibility:active?'visible':'hidden',opacity:showMask?1:0,cursor:'crosshair'},onPointerDown:e=>{if(e.button!==0 || stroke.current)return;e.currentTarget.setPointerCapture(e.pointerId);stroke.current={id:e.pointerId,mask:new Uint8ClampedArray(mask),point:null};paint(e)},onPointerMove:paint,onPointerUp:finish,onPointerCancel:finish,onLostPointerCapture:finish});
}
