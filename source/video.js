/** Local image/video sources and real-time canvas recording. No upload is performed. */
export function videoTime(seconds) {
  if(!Number.isFinite(seconds))return '0:00';
  return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
}
export function videoMime(Recorder=globalThis.MediaRecorder) {
  if(!Recorder)return '';
  return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(type=>Recorder.isTypeSupported(type))||'';
}
function waitVideoEvent(video,event,action) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>done(new Error('Видео не ответило. Попробуйте другой файл.')),15000);
    const ok=()=>done(),bad=()=>done(new Error('Не удалось прочитать видео. Попробуйте MP4 (H.264) или WebM.'));
    function done(error){clearTimeout(timer);video.removeEventListener(event,ok);video.removeEventListener('error',bad);error?reject(error):resolve();}
    video.addEventListener(event,ok,{once:true});video.addEventListener('error',bad,{once:true});
    try{action();}catch(error){done(error);}
  });
}
function useGridVideo(url,kind,source,freeze,setFreeze,canvas,logo,overlay,logoX,logoHeight) {
  const [status,setStatus]=O.useState({ready:false,time:0,duration:0,playing:false,error:''});
  const [recording,setRecording]=O.useState(false),[recordError,setRecordError]=O.useState('');
  const [result,setResult]=O.useState(null);
  const recordingRef=O.useRef(null),audioRef=O.useRef(null),resultRef=O.useRef(null),generation=O.useRef(0);
  const setPaused=value=>{freeze.current=value;setFreeze(value)};
  function clearResult(){if(resultRef.current)URL.revokeObjectURL(resultRef.current);resultRef.current=null;setResult(null);}
  O.useLayoutEffect(()=>{
    const token=++generation.current;let disposed=false;
    setStatus({ready:false,time:0,duration:0,playing:false,error:''});setRecordError('');clearResult();
    const media=kind==='video'?document.createElement('video'):new Image();source.current=media;
    if(kind!=='video'){
      media.gridAnimated=true;
      fetch(url).then(response=>response.arrayBuffer()).then(buffer=>{
        if(!disposed)media.gridAnimated=gridImageIsAnimated(new Uint8Array(buffer));
      }).catch(()=>{});
    }
    const update=()=>{if(!disposed)setStatus({ready:media.readyState>=2,time:media.currentTime||0,duration:Number.isFinite(media.duration)?media.duration:0,playing:!media.paused,error:''})};
    const fail=()=>{if(!disposed){setStatus(old=>({...old,ready:false,playing:false,error:kind==='video'?'Не удалось открыть видео. Попробуйте MP4 (H.264) или WebM.':'Не удалось открыть изображение.'}));recordingRef.current?.cancel();}};
    media.addEventListener('error',fail);
    const visibility=()=>{
      if(kind!=='video'||recordingRef.current)return;
      if(document.hidden){media.gridResumeOnVisible=!media.paused;media.pause()}
      else if(media.gridResumeOnVisible&&!freeze.current){media.gridResumeOnVisible=false;media.play().catch(()=>{})}
    };
    document.addEventListener('visibilitychange',visibility);
    if(kind==='video'){
      media.muted=true;media.playsInline=true;media.preload='auto';media.loop=true;
      Object.defineProperties(media,{naturalWidth:{get:()=>media.videoWidth},naturalHeight:{get:()=>media.videoHeight},complete:{get:()=>media.readyState>=2&&!media.seeking}});
      for(const event of ['loadeddata','durationchange','timeupdate','play','pause','seeked'])media.addEventListener(event,update);
      media.addEventListener('loadeddata',()=>{if(!disposed&&!freeze.current)media.play().catch(()=>update())},{once:true});
    }
    media.src=url;
    return ()=>{
      disposed=true;document.removeEventListener('visibilitychange',visibility);generation.current=token+1;recordingRef.current?.cancel();
      if(kind==='video'){media.pause();media.removeAttribute('src');media.load();}
      if(source.current===media)source.current=null;
      if(audioRef.current){audioRef.current.context.close().catch(()=>{});audioRef.current=null;}
      // StrictMode immediately mounts the same URL again; defer revocation until replacement.
      if(url.startsWith('blob:'))setTimeout(()=>{if(source.current?.src!==url)URL.revokeObjectURL(url)},0);
    };
  },[url,kind]);
  O.useEffect(()=>()=>{if(resultRef.current)URL.revokeObjectURL(resultRef.current)},[]);
  function toggle(){
    if(recordingRef.current)return;
    const media=source.current;if(kind!=='video'||!media)return;
    if(!media.paused){media.pause();media.gridNeedsFullFrame=true;media.gridFullFrame=true;setPaused(true)}else{media.gridFullFrame=false;setPaused(false);media.play().catch(()=>setRecordError('Не удалось запустить видео.'))}
  }
  function seek(value){
    const media=source.current;if(kind!=='video'||!media||recordingRef.current)return;
    media.pause();media.gridFullFrame=true;media.gridNeedsFullFrame=true;setPaused(false);media.currentTime=Math.max(0,Math.min(status.duration,value));
  }
  async function ensureFullFrame(){
    const media=source.current;if(kind!=='video'||!media)return true;
    media.pause();media.gridFullFrame=true;setPaused(true);
    try{await gridWaitForFullFrame(media);return true}catch(error){setRecordError(error.message);return false}
  }
  async function record(){
    const media=source.current,mime=videoMime();
    if(kind!=='video'||!media||media.readyState<2||recordingRef.current)return;
    if(!mime||!canvas.current?.captureStream){setRecordError('Запись видео недоступна в этом браузере. Откройте редактор в Chrome или Safari.');return;}
    const token=generation.current;let stream=null,recorder=null,raf=0,cancelled=false,finished=false;
    const oldLoop=media.loop;let audioTrack=null;
    function cleanup(){cancelAnimationFrame(raf);media.removeEventListener('ended',ended);stream?.getTracks().forEach(track=>track.stop());media.loop=oldLoop;media.muted=true;media.gridExporting=false;media.gridFullFrame=true;if(source.current===media){media.pause();setPaused(true)}if(recordingRef.current===controller)recordingRef.current=null;if(token===generation.current)setRecording(false)}
    function stop(){if(recorder&&recorder.state!=='inactive')recorder.stop();else if(!finished){cancelled=true;finished=true;cleanup()}}
    function ended(){// Allow the render loop to paint the final decoded frame.
      requestAnimationFrame(()=>requestAnimationFrame(()=>{paint();stop()}));
    }
    const controller={stop,cancel(){cancelled=true;stop()}};recordingRef.current=controller;
    media.gridExporting=true;media.gridNeedsFullFrame=true;setRecording(true);setRecordError('');clearResult();
    const output=document.createElement('canvas');output.width=output.height=1080;const ctx=output.getContext('2d');let paintedVersion=-1;
    function paint(){
      if(!canvas.current||paintedVersion===media.gridRenderVersion)return;paintedVersion=media.gridRenderVersion;
      ctx.drawImage(canvas.current,0,0,1080,1080);
      if(overlay.current&&getComputedStyle(overlay.current).visibility!=='hidden'){
        ctx.globalAlpha=Number(getComputedStyle(overlay.current).opacity);ctx.drawImage(overlay.current,0,0,1080,1080);ctx.globalAlpha=1;
      }

    }
    try{
      // Create/resume the audio graph during the click gesture. Preview remains muted.
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(Audio){
        if(!audioRef.current){const context=new Audio(),node=context.createMediaElementSource(media);audioRef.current={context,node};}
        const {context,node}=audioRef.current;await context.resume();
        const destination=context.createMediaStreamDestination();node.connect(destination);media.muted=false;
        audioTrack=destination.stream.getAudioTracks()[0];
        // Disconnect only this recording branch when its track is released.
        const disconnect=()=>{try{node.disconnect(destination)}catch{}};
        controller.disconnect=disconnect;
      }else{throw new Error('Экспорт со звуком недоступен в этом браузере. Откройте редактор в Chrome или Safari.');}
      if(cancelled||token!==generation.current)return;
      media.pause();media.loop=false;setPaused(false);
      if(media.currentTime!==0)await waitVideoEvent(media,'seeked',()=>{media.currentTime=0});
      if(cancelled||token!==generation.current)return;
      await gridWaitForFullFrame(media);
      if(logo.current&&!logo.current.complete)await logo.current.decode();
      if(cancelled||token!==generation.current)return;
      paint();stream=output.captureStream(30);if(audioTrack)stream.addTrack(audioTrack);
      recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});const chunks=[];
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      recorder.onerror=()=>{cancelled=true;if(token===generation.current)setRecordError('Запись прервалась. Попробуйте записать ещё раз.');stop()};
      recorder.onstop=()=>{
        finished=true;controller.disconnect?.();cleanup();
        if(cancelled||token!==generation.current)return;
        if(!chunks.length){setRecordError('Браузер не сохранил запись. Попробуйте другой формат исходного видео.');return;}
        const blob=new Blob(chunks,{type:recorder.mimeType||mime}),href=URL.createObjectURL(blob);
        const name=`grid-studio-1080x1080.${blob.type.includes('mp4')?'mp4':'webm'}`;
        resultRef.current=href;setResult({href,name});
        const link=document.createElement('a');link.href=href;link.download=name;link.click();
      };
      media.addEventListener('ended',ended,{once:true});recorder.start(1000);
      const tick=()=>{paint();raf=requestAnimationFrame(tick)};tick();await media.play();
    }catch(error){cancelled=true;if(token===generation.current)setRecordError(error.message||'Не удалось записать видео.');stop();}
    finally{if(cancelled){controller.disconnect?.();audioTrack?.stop();if(!finished&&(!recorder||recorder.state==='inactive')){finished=true;cleanup()}}}
  }
  return {kind,status,recording,recordError,result,toggle,seek,record,ensureFullFrame,isRecording:()=>!!recordingRef.current,stop:()=>recordingRef.current?.stop()};
}
function GridVideoControls({video}) {
  const {status,recording}=video;
  if(video.kind!=='video')return status.error?U.jsx('p',{role:'alert',children:status.error}):null;
  return U.jsxs('div',{className:'video-controls',children:[
    U.jsxs('div',{className:'video-timeline',children:[
      U.jsx('input',{type:'range',min:0,max:status.duration||1,step:.01,value:Math.min(status.time,status.duration||1),disabled:!status.ready||recording,'aria-label':'Позиция видео',onChange:e=>video.seek(Number(e.target.value))}),
      U.jsx('span',{'aria-live':'off',children:`${videoTime(status.time)} / ${videoTime(status.duration)}`})
    ]}),
    !status.ready&&!status.error&&U.jsx('p',{role:'status',children:'Загрузка видео…'}),
    (status.error||video.recordError)&&U.jsx('p',{role:'alert',children:status.error||video.recordError}),
    video.result&&U.jsx('a',{href:video.result.href,download:video.result.name,children:'Скачать готовое видео'})
  ]});
}
