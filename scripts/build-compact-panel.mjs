import fs from 'node:fs/promises';
const runtime = new URL('../assets/index-BwYdjEfo.js', import.meta.url);
const offline = new URL('../Grid Studio.html', import.meta.url);
const css = new URL('../assets/index-DlFOVRFE.css', import.meta.url);
const parameterComponent = `function GridParameterValue({label,value,min,max,step,onValueChange,suffix}){const[draft,setDraft]=O.useState(String(value));O.useEffect(()=>setDraft(String(value)),[value]);function commit(){const n=Number(draft),next=draft.trim()!==""&&Number.isFinite(n)?Number(Math.max(min,Math.min(max,min+Math.round((n-min)/step)*step)).toFixed(4)):value;setDraft(String(next));if(next!==value)onValueChange(next)}return U.jsxs("div",{className:"parameter-value",children:[U.jsx("input",{type:"number","aria-label":label+" — значение",inputMode:step<1?"decimal":"numeric",min,max,step,value:draft,onChange:event=>{const text=event.target.value;setDraft(text);const n=Number(text);if(text!==""&&Number.isFinite(n)&&n>=min&&n<=max)onValueChange(n)},onBlur:commit,onKeyDown:event=>{if(event.key==="Enter")event.currentTarget.blur()}}),suffix&&U.jsx("span",{"aria-hidden":"true",children:suffix.trim()})]})}`;
const sliderFunction = 'function Ge(at,bt,Rt,oe,Me,qe="",De=1){return U.jsxs("div",{className:"control compact-control",children:[U.jsx("span",{className:"parameter-label",children:at}),U.jsx(cg,{"aria-label":at,min:Rt,max:oe,step:De,value:[bt],onValueChange:([Al])=>Me(Al)}),U.jsx(GridParameterValue,{label:at,value:bt,min:Rt,max:oe,step:De,onValueChange:Me,suffix:qe})]})}';
function patch(text) {
  text = text.replace('sizeLabel:"Ширина свечения"', 'sizeLabel:"Свечение"');
  text = text.replace('mode:"letters",label:"Буквы"', 'mode:"letters",label:"Letters"');
  text = text.replace(/\{mode:"dithering",label:"Дизеринг",description:"[^"]*"\},?/, '').replace(',dithering:8', '');
  text = text.replace('U.jsx("label",{htmlFor:"dot-palette",className:"effect-label",children:"Градиент точек"}),', '').replace('id:"dot-palette",value:dotPalette', 'id:"dot-palette","aria-label":"Градиент точек",value:dotPalette');
  text = text.replace(/\{mode:"pixels",label:"Пиксели",description:"[^"]*",sizeLabel:"[^"]*"\},?/, '').replace(',pixels:8', '');
  text = text.replace(/\{mode:"halftone",label:"Растр",description:"[^"]*",sizeLabel:"[^"]*"\},?/, '').replace(',halftone:8', '');
  text = text.replaceAll('Ge("Масштаб изображения",', 'Ge("Масштаб",');
  for (const [from, to] of [['Интенсивность свечения', 'Интенсивность'], ['Шлейф движения', 'Шлейф'], ['Размер чёткой зоны', 'Чёткая зона']]) text = text.replaceAll('Ge("' + from + '",', 'Ge("' + to + '",');
  const summary = ',U.jsxs("div",{className:"summary",children:[f," × ",s,U.jsxs("span",{children:[f*s," ячеек"]})]})';
  text = text.replace(summary, '');
  text = text.replace('U.jsx(SS,{size:15})," Сетка "]', 'U.jsx(SS,{size:15})," Сетка ",U.jsxs("span",{className:"grid-cell-count",children:[f*s," ячеек"]})]');
  const image = 'U.jsxs("h2",{children:[U.jsx(ES,{size:15})," Изображение"]}),U.jsxs(ri,{className:"full-width",size:"sm",onClick:()=>nt.current?.click(),children:[U.jsx(_S,{size:14})," Заменить изображение"]})';
  const imageCompact = 'U.jsxs("h2",{className:"image-heading",children:[U.jsx(ES,{size:15})," Изображение",U.jsx("button",{type:"button",className:"replace-image","aria-label":"Заменить изображение",title:"Заменить изображение",onClick:()=>nt.current?.click(),children:U.jsx(_S,{size:16})})]})';
  text = text.replace(image, imageCompact);
  const effectStart = 'U.jsx("h2",{children:"Эффект"}),U.jsx("label",{htmlFor:"effect-mode",className:"effect-label",children:"Режим эффекта"}),';
  if (text.includes(effectStart)) {
    const start = text.indexOf(effectStart);
    const end = text.indexOf(',qn.sizeLabel', start);
    if (end < 0) throw new Error('Missing effect settings hook');
    const select = text.slice(start + effectStart.length, end).replace('id:"effect-mode",', 'id:"effect-mode","aria-label":"Режим эффекта",');
    text = text.slice(0, start) + 'U.jsxs("div",{className:"effect-heading",children:[U.jsx("h2",{children:"Эффект"}),' + select + ']})' + text.slice(end);
    if (text.includes(effectStart)) throw new Error('Missing effect select hook');
  }
  text = text.replace('U.jsx("h2",{children:"Эффект"})', 'U.jsxs("h2",{children:[U.jsxs("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.6,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[U.jsx("path",{d:"m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8L12 3Z"}),U.jsx("path",{d:"M20 2v4M18 4h4"})]})," Эффект"]})');
  if (!text.includes('function GridParameterValue(')) text = text.replace('function Hn(', parameterComponent + 'function Hn(');
  text = text.replace(/function Ge\(at,bt,Rt,oe,Me,qe="",De=1\)\{[\s\S]*?(?=return U\.jsxs\("main")/, () => sliderFunction);
  for (const marker of ['grid-cell-count', 'image-heading', 'effect-heading', 'compact-control']) if (!text.includes(marker)) throw new Error(`Missing compact UI: ${marker}`);
  return text;
}
const rules = `/* grid-compact-panel:start */
.grid-cell-count{margin-left:auto;color:#8f9191;font-family:AvitoSansTextMono,monospace;font-size:10px;font-weight:400;white-space:nowrap}
.grid-dimension{flex-direction:row;align-items:center;gap:4px;height:36px;padding:0 8px;background:#222424;border:1px solid #ffffff20;border-radius:8px}
.grid-dimension:hover{border-color:#ffffff40}
.grid-dimension:focus-within{outline:2px solid #8323f1;outline-offset:1px;border-color:#8323f1}
.grid-dimension label{flex:1;min-width:0;font-size:10px}
.grid-dimension input{font-size:10px;width:34px;height:34px;padding:0;text-align:right;background:transparent;border:0;border-radius:0;appearance:textfield;-moz-appearance:textfield}
.grid-dimension input:hover{background:transparent;border:0}
.grid-dimension input:focus{outline:none;border:0}
.grid-dimension input::-webkit-inner-spin-button,.grid-dimension input::-webkit-outer-spin-button{appearance:none;-webkit-appearance:none;margin:0}
aside .compact-control{display:grid;grid-template-columns:80px minmax(32px,1fr) 52px;align-items:center;gap:6px;margin-top:8px;min-height:34px}
.parameter-label{color:#bcbcbc;font-size:10px;line-height:1.3}
.compact-control .glass-slider-shell,.compact-control .studio-slider{height:34px;min-width:0}
.parameter-value{display:flex;align-items:center;justify-content:flex-end;gap:4px;height:26px;padding:0 8px;border:1px solid transparent;border-radius:6px;background:#222424;color:#999;font-family:AvitoSansTextMono,monospace;font-size:10px;min-width:0}
.parameter-value:hover{border-color:#ffffff30}
.parameter-value:focus-within{outline:2px solid #8323f1;outline-offset:1px}
.parameter-value input{width:100%;min-width:0;height:24px;padding:0;border:0;background:transparent;color:#fff;font-family:inherit;font-size:10px;text-align:right;outline:none;appearance:textfield;-moz-appearance:textfield}
.parameter-value input::-webkit-inner-spin-button,.parameter-value input::-webkit-outer-spin-button{appearance:none;-webkit-appearance:none;margin:0}
.parameter-value span{flex-shrink:0}
.image-heading .replace-image{margin-left:auto;display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:6px;background:transparent;color:#bcbcbc;cursor:pointer}
.image-heading .replace-image:hover{background:#ffffff0c;color:#fff}
.image-heading .replace-image:focus-visible{outline:2px solid #8323f1;outline-offset:2px}
.effect-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.effect-heading h2{margin:0;flex-shrink:0}
aside .effect-heading #effect-mode{width:154px;min-width:0;height:32px;margin:0;font-size:11px}
.panel-section .image-heading{margin-bottom:8px;min-height:28px}
@media(max-width:960px){.grid-dimension{height:44px}.grid-dimension label{font-size:11px}.grid-dimension input{height:42px;font-size:11px;width:36px}aside .compact-control{grid-template-columns:94px minmax(32px,1fr) 60px;min-height:44px}.parameter-label{font-size:11px}.compact-control .glass-slider-shell,.compact-control .studio-slider{height:44px}.parameter-value{height:40px;font-size:11px}.parameter-value input{height:38px;font-size:11px}.image-heading .replace-image{width:44px;height:44px}.panel-section .image-heading{min-height:44px}aside .effect-heading #effect-mode{height:44px;font-size:16px}}
aside .grid-line-opacity input{font-size:10px}aside .grid-line-opacity{gap:4px}@media(max-width:960px){aside .grid-line-opacity input{font-size:11px}}
/* grid-compact-panel:end */
`;
function styles(text) {
  text = text.replace(/\/\* grid-compact-panel:start \*\/[\s\S]*?\/\* grid-compact-panel:end \*\/\s*/g, '');
  return text.replace('/* grid-clean-palette */', rules + '\n/* grid-clean-palette */');
}
await fs.writeFile(runtime, patch(await fs.readFile(runtime, 'utf8')));
await fs.writeFile(css, styles(await fs.readFile(css, 'utf8')));
await fs.writeFile(offline, styles(patch(await fs.readFile(offline, 'utf8'))));
console.log('Updated compact property panel in both versions.');
