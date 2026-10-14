/** Budget the preview separately from the original 600px renderer. */
export function gridVideoPolicy(media,lastWork=0) {
  const video=media?.tagName==='VIDEO';
  const preview=video&&!media.paused&&!media.gridExporting&&!media.gridFullFrame;
  return {size:preview?300:600,preview,interval:preview?Math.max(1000/12,lastWork*2.5):1000/30};
}
export function gridResizeMask(mask,size) {
  if(size===600)return mask;
  const result=new Uint8ClampedArray(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)result[y*size+x]=mask[Math.floor(y*600/size)*600+Math.floor(x*600/size)];
  return result;
}
export function gridPublishVideoFrame(media,size) {
  if(media?.tagName!=='VIDEO')return;
  if(size===600)media.gridNeedsFullFrame=false;
  media.gridRenderedSize=size;media.gridRenderedTime=media.currentTime;
  media.gridRenderVersion=(media.gridRenderVersion||0)+1;
  media.dispatchEvent(new Event('gridframe'));
}

export function gridWaitForFullFrame(media,timeout=15000) {
  media.gridNeedsFullFrame=true;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{media.removeEventListener('gridframe',ready);reject(new Error('Не удалось подготовить кадр. Попробуйте ещё раз.'));},timeout);
    function ready(){if(media.gridRenderedSize!==600||Math.abs(media.gridRenderedTime-media.currentTime)>.001)return;clearTimeout(timer);media.removeEventListener('gridframe',ready);resolve();}
    media.addEventListener('gridframe',ready);
  });
}
