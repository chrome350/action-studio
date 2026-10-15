import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=(await Promise.all(['source/image-animation.js','source/video.js'].map(name=>fs.readFile(new URL(name,root),'utf8')))).join('\n').replaceAll('export function','function');
const module=`/* grid-video:start */${source}/* grid-video:end */`;
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 let s=await fs.readFile(new URL(name,root),'utf8');
 function patch(a,b){if(!s.includes(a))throw Error('Missing video hook: '+a);s=s.replace(a,b)}
 if(s.includes('/* grid-video:start */'))s=s.replace(/\/\* grid-video:start \*\/[\s\S]*?\/\* grid-video:end \*\//,module);
 else{
  patch('function MS(){',module+'function MS(){');
  patch('[rt,_t]=O.useState(bb),','[mediaKind,setMediaKind]=O.useState("image"),[mediaName,setMediaName]=O.useState("Цветы"),[rt,_t]=O.useState(bb),');
  patch('Ft=O.useRef(null);','Ft=O.useRef(null);const videoTools=useGridVideo(rt,mediaKind,Ft,_e,ye,Be,Ke,H,Qc,$h);');
  patch('O.useEffect(()=>{const at=new Image;return at.src=rt,Ft.current=at,()=>{rt.startsWith("blob:")&&URL.revokeObjectURL(rt)}},[rt]),','');
  patch('let at=0,bt=null,Rt=!1,oe=null,Me=null,dotPrepared=null;', 'let videoFrame=-1;let at=0,bt=null,Rt=!1,oe=null,Me=null,dotPrepared=null;');
  patch('const Je=Ft.current?.complete&&Ft.current.naturalWidth?Ft.current:null;', 'const Je=Ft.current?.complete&&Ft.current.naturalWidth?Ft.current:null;const videoSource=Ft.current?.tagName==="VIDEO";if(videoSource&&Je&&Je.currentTime!==videoFrame){if(Rt&&El-fu<1000/30){at=requestAnimationFrame(ya);return}videoFrame=Je.currentTime;Rt=false;dotPrepared=null}');
  patch('lettersMotion.current.cells=[];bt=Je,','lettersMotion.current.previousCells=lettersMotion.current.cells;lettersMotion.current.cells=[];bt=Je,');
  patch('function cn(){_e.current=!_e.current,ye(_e.current)}','function cn(){if(videoTools.isRecording())return;_e.current=!_e.current;ye(_e.current);const media=Ft.current;if(media?.tagName==="VIDEO"){if(_e.current)media.pause();else media.play().catch(()=>{})}}');
  patch('children:"Цветы · 600 × 600 px"','children:mediaName+" · 600 × 600 px"');
  patch('" Изображение",U.jsx("button"','mediaKind==="video"?" Видео":" Изображение",U.jsx("button"');
  patch('"aria-label":"Заменить изображение",title:"Заменить изображение",','"aria-label":"Загрузить изображение или видео",title:"Загрузить изображение или видео",disabled:videoTools.recording,');
  patch('Ge("Масштаб",x,25,200,D,"%")','U.jsx(GridVideoControls,{video:videoTools}),Ge("Масштаб",x,25,200,D,"%")');
  patch('title:"Пробел — заморозить или продолжить",onClick:cn','title:"Пробел — заморозить или продолжить",disabled:videoTools.recording,onClick:cn');
  patch('accept:"image/*"','accept:"image/*,video/*"');
  patch('bt&&(_t(URL.createObjectURL(bt)),_e.current=!1,ye(!1),at.target.value="")','bt&&(videoTools.isRecording()||(setMediaKind(bt.type.startsWith("video/")||/\\.(mp4|webm|mov|m4v|ogv)$/i.test(bt.name)?"video":"image"),setMediaName(bt.name),_t(URL.createObjectURL(bt)),L(0),_e.current=!1,ye(!1)),at.target.value="")');
 }
 if(!s.includes('onClick:mediaKind==="video"?(videoTools.recording?videoTools.stop:videoTools.record):va')){
  patch('className:"liquid-button-primary",onClick:va,children:[U.jsx(pS,{size:14})," Скачать PNG"]', 'className:"liquid-button-primary",disabled:mediaKind==="video"&&!videoTools.status.ready&&!videoTools.recording,onClick:mediaKind==="video"?(videoTools.recording?videoTools.stop:videoTools.record):va,children:[U.jsx(pS,{size:14}),mediaKind==="video"?(videoTools.recording?" Завершить и сохранить":" Экспорт видео"):" Скачать PNG"]');
 }
 s=s.replace('U.jsx(GridVideoControls,{video:videoTools})','U.jsx(GridVideoControls,{video:videoTools,onSaveFrame:va})');
 if(!s.includes('className:"video-save-frame"')){
  patch('U.jsxs(ri,{size:"sm",className:"liquid-button-primary",disabled:mediaKind', 'mediaKind==="video"&&U.jsxs(ri,{size:"sm",className:"video-save-frame",disabled:!videoTools.status.ready||videoTools.recording,onClick:va,children:[U.jsx(pS,{size:14})," Сохранить PNG"]}),U.jsxs(ri,{size:"sm",className:"liquid-button-primary",disabled:mediaKind');
 }
 s=s.replace('className:"bottom-actions",children:', 'className:"bottom-actions","data-video":mediaKind==="video",children:');
 await fs.writeFile(new URL(name,root),s);
}
const css=`\n/* grid-video-controls:start */\n.bottom-actions[data-video=true] .liquid-button-primary{grid-column:auto}.video-controls{display:grid;gap:12px;margin:0 0 24px}.video-timeline{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px}.video-timeline span{font:12px AvitoSansTextMono,monospace;white-space:nowrap;color:#aaa}.video-controls button,.video-controls a{border:1px solid #ffffff26;border-radius:10px;padding:10px 12px;background:#ffffff08;color:#eee;font:inherit;font-size:13px;text-align:center;cursor:pointer;text-decoration:none}.video-controls button:disabled{opacity:.45;cursor:default}.video-controls input[type=range]{width:100%;accent-color:#a100ff}.video-controls p{margin:0;color:#999;font-size:12px;line-height:1.5}.video-controls [role=alert]{color:#ff9696}.document-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%}\n/* grid-video-controls:end */\n`;
const styleFile=new URL('assets/index-DlFOVRFE.css',root);let styles=await fs.readFile(styleFile,'utf8');styles=styles.replace(/\n?\/\* grid-video-controls:start \*\/[\s\S]*?\/\* grid-video-controls:end \*\//,'');await fs.writeFile(styleFile,styles+css);
const offlineFile=new URL('Grid Studio.html',root);let offline=await fs.readFile(offlineFile,'utf8');offline=offline.replace(/\n?\/\* grid-video-controls:start \*\/[\s\S]*?\/\* grid-video-controls:end \*\//,'');await fs.writeFile(offlineFile,offline.replace('</style>',css+'</style>'));
console.log('Video upload, transport and recording updated in both builds.');
