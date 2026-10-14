const DotMatrixPalettes = [
  {id:'spectrum',name:'Спектр',colors:['#FF8A00','#FF248C','#7628FF','#00D9ED']},
  {id:'confa',name:'Оранжевый и синий',colors:['#FF6E14','#FFFFFF','#34A4FA','#3E6BFF']},
  {id:'cool',name:'Бирюза и фиолетовый',colors:['#25E5D0','#34A4FA','#8060F5','#C477FF']},
  {id:'mono',name:'Монохром',colors:['#FFFFFF','#FFFFFF','#FFFFFF','#FFFFFF']}
];
/** Global lattice; area averaging removes texture and attenuates narrow structures.
 * No random sampling, binary luminance threshold, or per-cell grid restart.
 */
export function renderDotMatrix(data, width, height, spacing = 6, contrast = 1, profile = null, colors = null) {
  const step = Math.max(4, spacing);
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
  const black=profile?.black ?? Math.max(.018,Math.min(.04,low*.20));
  // Minimum span avoids amplifying noise in almost uniform/dark images.
  const white=profile?.white ?? Math.max(black+.18,high+(high-low)*.10);
  canvas.dotMatrixProfile={black,white};
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
    if(stops.length) ctx.fillStyle=colorAt(((x/width+y/height)/2-colorMin)/Math.max(.01,colorMax-colorMin));
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2); ctx.fill();
  }
  return canvas;
}
