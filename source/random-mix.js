/** Soft neighbour avoidance keeps variation without forcing a checkerboard. */
export function chooseMixedEffect(modes, cells, index, columns, previous, random = Math.random) {
  const available=modes.filter(mode=>mode!==previous);
  if(!available.length)return modes[0]??previous;
  const col=index%columns;
  const neighbours=[index-columns,index+columns];
  if(col>0)neighbours.push(index-1);
  if(col<columns-1)neighbours.push(index+1);
  const counts={};
  for(const [key,cell] of Object.entries(cells))if(Number(key)!==index)counts[cell.mode]=(counts[cell.mode]||0)+1;
  const least=Math.min(...available.map(mode=>counts[mode]||0));
  const weights=available.map(mode=>{
    const matching=neighbours.filter(key=>cells[key]?.mode===mode).length;
    return (mode==='clean'?1.5:1)*Math.pow(.45,matching)/Math.sqrt(1+Math.max(0,(counts[mode]||0)-least));
  });
  let pick=random()*weights.reduce((sum,w)=>sum+w,0);
  for(let i=0;i<available.length;i++){pick-=weights[i];if(pick<0)return available[i];}
  return available[available.length-1];
}
