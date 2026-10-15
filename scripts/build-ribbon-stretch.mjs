import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=(await Promise.all(['source/ribbon-mask.js','source/ribbon-stretch.js'].map(name=>fs.readFile(new URL(name,root),'utf8')))).join('\n').replaceAll('export function','function');
const module=`/* grid-ribbon-stretch:start */${source}/* grid-ribbon-stretch:end */`;
function replace(s,a,b){if(!s.includes(a))throw Error('Missing ribbon hook: '+a);return s.replace(a,b)}
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 if(s.includes('/* grid-ribbon-stretch:start */'))s=s.replace(/\/\* grid-ribbon-stretch:start \*\/[\s\S]*?\/\* grid-ribbon-stretch:end \*\//,module);
 else {
  s=replace(s,'function MS(){',module+'function MS(){');
  s=replace(s,'Ih={','Ih={ribbons:85,');
  s=replace(s,'ci=[','ci=[{mode:"ribbons",label:"Ленты",description:"Лепестки и детали вытягиваются в плавные цветные ленты. Подведите начало шлейфа к краю объекта.",sizeLabel:"Длина лент"},');
  s=replace(s,'[actionClarity,setActionClarity]=O.useState(16),','[ribbonAnchor,setRibbonAnchor]=O.useState(55),[ribbonBend,setRibbonBend]=O.useState(45),[ribbonDirection,setRibbonDirection]=O.useState("left"),[actionClarity,setActionClarity]=O.useState(16),');
  s=replace(s,'const dotMatrixImage=', 'const ribbonImage=Je&&(P==="ribbons"||Object.values(K).some(cell=>cell.mode==="ribbons"))?renderRibbonStretch(Mt.getImageData(0,0,600,600).data,600,600,J.ribbons,ribbonAnchor,ribbonBend,ribbonDirection):null;const dotMatrixImage=');
  s=replace(s,'cl=Mt.getImageData(Zt,il,Ie,Ne);if(', 'cl=Mt.getImageData(Zt,il,Ie,Ne);if((K[kt*f+ne]?.mode||P)==="ribbons"){if(ribbonImage){Mt.drawImage(ribbonImage,Zt,il,Ie,Ne,Zt,il,Ie,Ne);ib(cl.data,W/100,j)&&gi.push(kt*f+ne)}continue}if(');
  s=replace(s,'actionClarity,dotColors,dotAnimate,dotPalette]);','actionClarity,dotColors,dotAnimate,dotPalette,ribbonAnchor,ribbonBend,ribbonDirection]);');
  s=replace(s,'setActionClarity(16),','setRibbonAnchor(55),setRibbonBend(45),setRibbonDirection("left"),setActionClarity(16),');
  s=replace(s,'Sl.size,P==="dotmatrix"?4:', 'Sl.size,P==="ribbons"?0:P==="dotmatrix"?4:');
  s=replace(s,'60,at=>Yn({size:at})','P==="ribbons"?100:60,at=>Yn({size:at})');
  s=replace(s,'at=>Yn({size:at})," px")','at=>Yn({size:at}),P==="ribbons"?"%":" px")');
  s=replace(s,'P==="clean"&&U.jsxs(U.Fragment,{children:[Ge("Интенсивность"', 'P==="ribbons"&&U.jsxs(U.Fragment,{children:[Ge("Начало шлейфа",ribbonAnchor,5,95,at=>{setRibbonAnchor(at);L(0)},"%"),Ge("Изгиб",ribbonBend,0,100,at=>{setRibbonBend(at);L(0)},"%"),U.jsxs("label",{className:"dot-palette-control",children:["Направление",U.jsxs("select",{"aria-label":"Направление лент",value:ribbonDirection,onChange:e=>{setRibbonDirection(e.target.value);L(0)},children:[U.jsx("option",{value:"left",children:"Влево"}),U.jsx("option",{value:"right",children:"Вправо"})]})]})]}),P==="clean"&&U.jsxs(U.Fragment,{children:[Ge("Интенсивность"');
 }

 if(!s.includes('[ribbonMask,setRibbonMask]')) {
  s=replace(s,'[ribbonAnchor,setRibbonAnchor]=O.useState(55),','[ribbonCapture,setRibbonCapture]=O.useState(8),[ribbonMask,setRibbonMask]=O.useState(()=>new Uint8ClampedArray(360000)),[ribbonBrush,setRibbonBrush]=O.useState(true),[ribbonBrushSize,setRibbonBrushSize]=O.useState(24),[ribbonErase,setRibbonErase]=O.useState(false),');
  s=replace(s,'J.ribbons,ribbonAnchor,ribbonBend,ribbonDirection','J.ribbons,ribbonCapture,ribbonBend,ribbonDirection,ribbonMask');
  s=replace(s,'ribbonAnchor,ribbonBend,ribbonDirection]','ribbonCapture,ribbonBend,ribbonDirection,ribbonMask]');
  s=replace(s,'setRibbonAnchor(55),','setRibbonCapture(8),setRibbonMask(new Uint8ClampedArray(360000)),setRibbonBrush(true),setRibbonBrushSize(24),setRibbonErase(false),');
  s=replace(s,'Ge("Начало шлейфа",ribbonAnchor,5,95,at=>{setRibbonAnchor(at);L(0)},"%"),','Ge("Ширина захвата",ribbonCapture,1,40,at=>{setRibbonCapture(at);L(0)}," px"),Ge("Размер кисти",ribbonBrushSize,6,80,setRibbonBrushSize," px"),U.jsxs("div",{style:{display:"flex",gap:8,flexWrap:"wrap"},children:[U.jsx(ri,{size:"sm","aria-pressed":ribbonBrush,onClick:()=>setRibbonBrush(!ribbonBrush),children:ribbonBrush?"Готово / скрыть маску":"Выбрать края кистью"}),U.jsx(ri,{size:"sm","aria-pressed":ribbonErase,onClick:()=>setRibbonErase(!ribbonErase),children:ribbonErase?"Ластик включён":"Ластик"}),U.jsx(ri,{size:"sm",onClick:()=>{setRibbonMask(new Uint8ClampedArray(360000));L(0)},children:"Очистить выбор"})]}),U.jsx("p",{style:{fontSize:12,color:"#aaa",lineHeight:1.5},children:"Проведите кистью по внешнему краю лепестка. Розовый цвет — выбранная зона; он не попадёт в PNG. Лучше всего работает на однотонном фоне."}),');
  s=replace(s,'U.jsx("canvas",{ref:H,','P==="ribbons"&&U.jsx(RibbonBrush,{mask:ribbonMask,size:ribbonBrushSize,erase:ribbonErase,active:ribbonBrush,onChange:next=>{setRibbonMask(next);L(0);_e.current=false;ye(false)}}),U.jsx("canvas",{ref:H,');
  // Clear selection when the source or its scale changes: stale coordinates
  // must never act on a different flower. Stop cycling while painting.
  s=replace(s,'Ft=O.useRef(null);O.useEffect','Ft=O.useRef(null);O.useEffect(()=>{setRibbonMask(new Uint8ClampedArray(360000))},[rt,x]);O.useEffect(()=>{if(P==="ribbons"&&ribbonBrush){ht(false);vt(false);w({});_e.current=false;ye(false)}},[P,ribbonBrush]);O.useEffect');
 }
 // The existing selection still resets when image coordinates change. Reusing
 // an already empty mask avoids an otherwise redundant full canvas render.
 const previousMaskReset='O.useEffect(()=>{setRibbonMask(new Uint8ClampedArray(360000))},[rt,x]);';
 const optimizedMaskReset='O.useEffect(()=>{setRibbonMask(resetRibbonMask)},[rt,x]);';
 if(s.includes(previousMaskReset))s=replace(s,previousMaskReset,optimizedMaskReset);
 else if(!s.includes(optimizedMaskReset))throw Error('Missing ribbon mask reset hook');
 s=s.replace('Лепестки и детали вытягиваются в плавные цветные ленты. Подведите начало шлейфа к краю объекта.','Выберите кистью края лепестков: ленты вытягиваются из выбранной зоны, основной объект остаётся резким.');
 if(!s.includes('[ribbonShowMask,setRibbonShowMask]')) {
  s=replace(s,'[ribbonBrush,setRibbonBrush]=O.useState(true),','[ribbonBrush,setRibbonBrush]=O.useState(true),[ribbonShowMask,setRibbonShowMask]=O.useState(true),');
  s=replace(s,'active:ribbonBrush,onChange:next','active:ribbonBrush,showMask:ribbonShowMask,onChange:next');
  s=replace(s,'setRibbonBrush(true),setRibbonBrushSize','setRibbonBrush(true),setRibbonShowMask(true),setRibbonBrushSize');
  s=replace(s,'Ge("Размер кисти",ribbonBrushSize,6,80,setRibbonBrushSize," px"),','Ge("Размер кисти",ribbonBrushSize,6,80,setRibbonBrushSize," px"),U.jsxs("label",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12},children:[U.jsx("input",{type:"checkbox",checked:ribbonShowMask,onChange:e=>setRibbonShowMask(e.target.checked),"aria-label":"Показывать выделение"}),"Показывать выделение"]}),');
 }
 s=s.replace('children:ribbonBrush?"Готово / скрыть маску":"Выбрать края кистью"','children:ribbonBrush?"Завершить рисование":"Рисовать кистью"');
 s=s.replace('[ribbonCapture,setRibbonCapture]=O.useState(8)','[ribbonCapture,setRibbonCapture]=O.useState(24)').replace('setRibbonCapture(8),','setRibbonCapture(24),');
 s=s.replace('Проведите кистью по внешнему краю лепестка. Розовый цвет — выбранная зона; он не попадёт в PNG. Лучше всего работает на однотонном фоне.','Закрасьте край лепестка с небольшим заходом внутрь: выбранная поверхность плавно вытянется в ленту. Центр оставьте невыбранным. Маска не попадёт в PNG.');
 if(!s.includes('ribbonExportFrame=O.useRef(null)')) {
  s=replace(s,'[ribbonCapture,setRibbonCapture]=O.useState(24),','ribbonExportFrame=O.useRef(null),[ribbonCapture,setRibbonCapture]=O.useState(24),');
  s=replace(s,'J.ribbons,ribbonCapture,ribbonBend,ribbonDirection,ribbonMask):null;','J.ribbons,ribbonCapture,ribbonBend,ribbonDirection,ribbonMask,Je,x,Y):null;ribbonExportFrame.current=ribbonImage?{image:ribbonImage.highResolution,columns:f,rows:s,mode:P,cells:K,grid:v,color:T,opacity:b}:null;');
  s=replace(s,'Rt.drawImage(Be.current,0,0,1080,1080),','Rt.drawImage(Be.current,0,0,1080,1080),drawRibbonExport(Rt,ribbonExportFrame.current),');
 }
 s=s.replace('mode:"ribbons",label:"Ленты"','mode:"ribbons",label:"Ribbons"')
 .replace('U.jsx(ri,{size:"sm","aria-pressed":ribbonBrush,onClick:()=>setRibbonBrush(!ribbonBrush),children:ribbonBrush?"Завершить рисование":"Рисовать кистью"}),','')
 .replace('children:ribbonErase?"Ластик включён":"Ластик"','children:"Ластик"')
 .replace('U.jsx("p",{style:{fontSize:12,color:"#aaa",lineHeight:1.5},children:"Закрасьте край лепестка с небольшим заходом внутрь: выбранная поверхность плавно вытянется в ленту. Центр оставьте невыбранным. Маска не попадёт в PNG."}),','');
 await fs.writeFile(file,s);
}
console.log('Ribbon Stretch updated in web and offline builds.');
