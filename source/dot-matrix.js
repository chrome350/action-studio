const DotMatrixPalettes = [
  {id:'confa',name:'Оранжевый и синий',colors:['#FF6E14','#FFFFFF','#34A4FA','#3E6BFF']},
  {id:'cool',name:'Бирюза и фиолетовый',colors:['#25E5D0','#34A4FA','#8060F5','#C477FF']},
  {id:'ember',name:'Огненный',colors:['#D8C1A5','#EF4000','#B40100','#70120B']},
  {id:'mono',name:'Монохром',colors:['#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF']}
];
/** Explicit preparation for one immutable source frame. The caller replaces this
 * object when the pixels change; mutable arrays are never cached implicitly.
 */
export function prepareDotMatrixSource(data, width, height) {
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  const support = new Float64Array(integral.length);
  for (let y = 0; y < height; y++) {
    let row = 0, coverage = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const luminance = Math.sqrt(.299 * data[i]**2 + .587 * data[i+1]**2 + .114 * data[i+2]**2) / 255 * data[i+3] / 255;
      row += luminance;
      const presence = Math.max(0, Math.min(1, (luminance-.035)/.065));
      coverage += presence*presence*(3-2*presence);
      support[(y+1)*stride+x+1] = support[y*stride+x+1] + coverage;
      integral[(y+1)*stride+x+1] = integral[y*stride+x+1] + row;
    }
  }
  return {data,width,height,stride,integral,support,analysis:null,geometry:null};
}

function dotMatrixAnalysis(source, step) {
  if (source.analysis?.step === step) return source.analysis;
  const {width,height,stride,integral,support}=source;
  const half = step * .85;
  const average = (plane, x, y, radius) => {
    const x0=Math.max(0,Math.floor(x-radius)),x1=Math.min(width,Math.ceil(x+radius));
    const y0=Math.max(0,Math.floor(y-radius)),y1=Math.min(height,Math.ceil(y+radius));
    return (plane[y1*stride+x1]-plane[y0*stride+x1]-plane[y1*stride+x0]+plane[y0*stride+x0])/((x1-x0)*(y1-y0));
  };
  // Analyse the entire softened source, never individual editor cells.
  // A reusable profile can freeze exposure for a future video pipeline.
  const samples = [];
  let colorMin=1,colorMax=0;
  for(let y=2;y<height;y+=4) for(let x=2;x<width;x+=4) {
    const value=average(integral,x,y,half);
    if(value>.04) samples.push(value);
    if(value>.08){const position=(x/width+y/height)/2;colorMin=Math.min(colorMin,position);colorMax=Math.max(colorMax,position);}
  }
  samples.sort((a,b)=>a-b);
  const percentile=p=>samples.length?samples[Math.floor((samples.length-1)*p)]:0;
  const low=percentile(.08),high=percentile(.96);
  return source.analysis={step,half,average,low,high,colorMin,colorMax};
}

function dotMatrixGeometry(source, step, contrast, profile) {
  const {width,height,support,integral}=source;
  const {half,average,low,high,colorMin,colorMax}=dotMatrixAnalysis(source,step);
  const black=profile?.black ?? Math.max(.018,Math.min(.04,low*.20));
  // Minimum span avoids amplifying noise in almost uniform/dark images.
  const white=profile?.white ?? Math.max(black+.18,high+(high-low)*.10);
  const previous=source.geometry;
  if(previous && previous.step===step && Object.is(previous.contrast,contrast) && Object.is(previous.black,black) && Object.is(previous.white,white))return previous;
  const dots = [];
  for (let y = step/2; y < height; y += step) for (let x = step/2; x < width; x += step) {
    // Keep a smaller sampling footprint for narrow stems instead of averaging
    // their signal away with the surrounding black background.
    const coarse = average(integral,x,y,half);
    const fine = average(integral,x,y,step*.30);
    const mean = Math.max(coarse, coarse*.3+fine*.7);
    const normalized = Math.max(0, Math.min(1, (mean-black)/(white-black)));
    const adjusted = Math.max(0, Math.min(1, (normalized-.5)*contrast+.5));
    // Keep the source black point even when the contrast control is reduced.
    const gate = Math.max(0, Math.min(1, (mean-.04)/.035));
    const lifted = adjusted + .16 * Math.pow(1-adjusted, 3);
    const tone = lifted * gate * gate * (3-2*gate);
    // Continuous diameter mapping gives dark areas almost no coverage, without popping.
    // Broad-form support attenuates stems regardless of their colour or orientation.
    // Continuous coverage avoids binary masks and keeps the grid fixed.
    const coverage = average(support, x, y, Math.max(24, step*3));
    const broad = Math.max(0, Math.min(1, (coverage-.18)/.52));
    const structure = .65 + .35*broad*broad*(3-2*broad);
    const radius = step * .40 * Math.pow(tone, .70) * structure;
    if (radius === 0) continue;
    dots.push({x,y,radius,position:Math.max(0,Math.min(1,((x/width+y/height)/2-colorMin)/Math.max(.01,colorMax-colorMin)))});
  }
  const bounds=dots.reduce((b,d)=>({left:Math.min(b.left,d.x),right:Math.max(b.right,d.x),top:Math.min(b.top,d.y),bottom:Math.max(b.bottom,d.y)}),{left:width,right:0,top:height,bottom:0});
  const span=Math.max(1,bounds.right-bounds.left,bounds.bottom-bounds.top);
  const centerX=(bounds.left+bounds.right)/2,centerY=(bounds.top+bounds.bottom)/2;
  return source.geometry={step,contrast,black,white,dots,span,centerX,centerY};
}

/** Global lattice; area averaging removes texture and attenuates narrow structures.
 * No random sampling, binary luminance threshold, or per-cell grid restart.
 * A prepared source reuses analysis/geometry across palette and contrast edits;
 * each result still owns its canvas so a pending frame cannot alter the old one.
 */
export function renderDotMatrix(data, width, height, spacing = 6, contrast = 1, profile = null, colors = null, phase = null, prepared = null) {
  const step = Math.max(4, spacing);
  const source=prepared?.data===data && prepared.width===width && prepared.height===height ? prepared : prepareDotMatrixSource(data,width,height);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#FFFFFF';
  const stops = Array.isArray(colors) ? colors.filter(c=>/^#[0-9a-f]{6}$/i.test(c)).map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))) : [];
  const colorAt = t => {
    const position=Math.max(0,Math.min(1,t))*(stops.length-1);
    const a=Math.floor(position),b=Math.min(stops.length-1,a+1),mix=position-a;
    return `rgb(${stops[a].map((v,i)=>Math.round(v+(stops[b][i]-v)*mix)).join(',')})`;
  };
  const {black,white,dots,span,centerX,centerY}=dotMatrixGeometry(source,step,contrast,profile);
  canvas.dotMatrixProfile={black,white};
  // Broad, deforming mesh-gradient regions, inspired by the flowing video reference.
  // Geometry is prepared once. Animation repaints colours only.
  canvas.repaintGradient = (phase = null) => {
    ctx.fillStyle='#000000';ctx.fillRect(0,0,width,height);
    const angle=(phase===null?0:phase%1)*Math.PI*2;
    const anchors=[[.12,.05,0],[.88,.15,3],[.46,.60,1],[.05,1.02,2],[1.02,.94,0]];
    const pools=phase===null||!stops.length?[]:anchors.map(([x,y,index],i)=>{
      const seed=i*1.71;
      return {
        x:x+.16*Math.sin(angle+seed)+.055*Math.sin(2*angle-seed),
        y:y+.19*Math.sin(angle+seed+1.2),
        sx:.27+.055*Math.sin(angle+seed+.8),
        sy:.31+.07*Math.cos(angle+seed),
        color:stops[index%stops.length]
      };
    });
    for(const {x,y,radius,position} of dots){
      let color=stops.length?colorAt(position):'#FFFFFF';
      if(pools.length){
        const u=(x-centerX)/span+.5,v=(y-centerY)/span+.5;
        // A shared low-frequency flow stretches the regions into soft irregular
        // shapes rather than moving recognisable circular blobs around the canvas.
        const warpedU=u+.15*Math.sin(v*4.2+angle)+.07*Math.cos(u*3.1-v*2.4-angle);
        const warpedV=v+.14*Math.sin(u*3.8-angle+.9)+.06*Math.sin(v*3+u*2+angle);
        let weight=0;const rgb=[0,0,0];
        for(const pool of pools){
          const d=((warpedU-pool.x)/pool.sx)**2+((warpedV-pool.y)/pool.sy)**2;
          const w=Math.exp(-d*1.25);
          weight+=w;
          for(let channel=0;channel<3;channel++)rgb[channel]+=pool.color[channel]*w;
        }
        color=`rgb(${rgb.map(value=>Math.round(value/Math.max(1e-12,weight))).join(',')})`;
      }
      ctx.fillStyle=color;
      ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
    }
    return canvas;
  };
  canvas.repaintGradient(phase);
  return canvas;
}
