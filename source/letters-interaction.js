/** Cached glyph tiles: no source-image processing during pointer animation. */
export function createLettersInteraction() {
  return {pointer:null, cells:[], last:0};
}
export function cacheLettersCell(state, canvas, x, y, size, background) {
  const image=document.createElement('canvas');image.width=canvas.width;image.height=canvas.height;
  const ctx=image.getContext('2d');ctx.drawImage(canvas,0,0);
  // Transparent tile backgrounds prevent moving letters from erasing neighbours.
  const pixels=ctx.getImageData(0,0,image.width,image.height),rgb=[1,3,5].map(i=>parseInt(background.slice(i,i+2),16));
  for(let i=0;i<pixels.data.length;i+=4)if(rgb.every((v,c)=>pixels.data[i+c]===v))pixels.data[i+3]=0;
  ctx.putImageData(pixels,0,0);
  ctx.font=`600 ${Math.max(2,size)}px "SFMono-Regular", Menlo, Consolas, monospace`;
  const dx=ctx.measureText('M').width+Math.max(2,size)*.14,dy=Math.max(2,size)*1.4;
  const tiles=[];
  for(let row=Math.floor(y/dy);row*dy<y+image.height;row++)for(let col=Math.floor(x/dx);col*dx<x+image.width;col++){
    const left=Math.max(0,Math.round(col*dx-x)),top=Math.max(0,Math.round(row*dy-y));
    const right=Math.min(image.width,Math.round((col+1)*dx-x)),bottom=Math.min(image.height,Math.round((row+1)*dy-y));
    if(right>left&&bottom>top)tiles.push({anchorX:(col+.5)*dx,anchorY:(row+.5)*dy,left,top,w:right-left,h:bottom-top,ox:0,oy:0,vx:0,vy:0});
  }
  const previous=state.previousCells?.find(cell=>cell.x===x&&cell.y===y&&cell.size===size);
  if(previous)for(let i=0;i<tiles.length;i++){
    const old=previous.tiles[i];if(old&&old.anchorX===tiles[i].anchorX&&old.anchorY===tiles[i].anchorY){
      for(const key of ['ox','oy','vx','vy'])tiles[i][key]=old[key];
    }
  }
  state.cells.push({image,x,y,size,tiles,background});
}
export function drawLettersInteraction(ctx,state,enabled,radius,strength,reduced,now,gridVisible=true) {
  const dt=Math.min(2,Math.max(.1,(now-(state.last||now-16.67))/16.67));state.last=now;
  const pointer=enabled&&!reduced?state.pointer:null;
  // Clear every cell before drawing: a later cell must not erase a neighbour's letters.
  for(const cell of state.cells){
    ctx.fillStyle=cell.background;ctx.fillRect(cell.x,cell.y,cell.image.width,cell.image.height);
  }
  ctx.save();
  if(!gridVisible){
    // One union mask removes internal seams while protecting other effects in mixed grids.
    ctx.beginPath();
    for(const cell of state.cells)ctx.rect(cell.x,cell.y,cell.image.width,cell.image.height);
    ctx.clip();
  }
  for(const cell of state.cells){
    ctx.save();
    if(gridVisible){ctx.beginPath();ctx.rect(cell.x,cell.y,cell.image.width,cell.image.height);ctx.clip();}
    for(const tile of cell.tiles){
      let tx=0,ty=0;
      if(pointer){const dx=(tile.anchorX??cell.x+tile.left+tile.w/2)-pointer.x,dy=(tile.anchorY??cell.y+tile.top+tile.h/2)-pointer.y,d=Math.hypot(dx,dy);
        if(d<radius){const force=(1-d/radius)**2*strength*(pointer.down?1.6:1);tx=dx/Math.max(1,d)*force;ty=dy/Math.max(1,d)*force;}}
      if(!enabled||reduced){tile.ox=tile.oy=tile.vx=tile.vy=0;}else{
        tile.vx=(tile.vx+(tx-tile.ox)*.12*dt)*Math.pow(.65,dt);tile.vy=(tile.vy+(ty-tile.oy)*.12*dt)*Math.pow(.65,dt);
        tile.ox+=tile.vx*dt;tile.oy+=tile.vy*dt;
      }
      ctx.drawImage(cell.image,tile.left,tile.top,tile.w,tile.h,cell.x+tile.left+tile.ox,cell.y+tile.top+tile.oy,tile.w,tile.h);
    }
    ctx.restore();
  }
  ctx.restore();
}
