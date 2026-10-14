import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const summary = 'U.jsxs("div",{className:"summary",children:[f," × ",s,U.jsxs("span",{children:[f*s," ячеек"]})]})';
const color = 'U.jsxs("div",{className:"color-row",children:[U.jsx("label",{htmlFor:"grid-color",children:"Цвет линий"}),U.jsx(Bf,{id:"grid-color",label:"Цвет линий",value:T,onChange:_}),U.jsx(Gf,{value:T})]})';
const legacyLineControl = 'U.jsx(GridLineControl,{color:T,opacity:b,onColorChange:_,onOpacityChange:m})';
const lineControl = 'U.jsx(GridLineControl,{color:T,opacity:b,onColorChange:_,onOpacityChange:m,visible:v,onVisibleChange:S})';
const lineComponent = `function GridLineControl({color,opacity,onColorChange,onOpacityChange,visible,onVisibleChange}){const[hex,setHex]=O.useState(color.slice(1).toUpperCase()),[alpha,setAlpha]=O.useState(String(opacity));O.useEffect(()=>setHex(color.slice(1).toUpperCase()),[color]);O.useEffect(()=>setAlpha(String(opacity)),[opacity]);function commitAlpha(){const n=Number(alpha),next=alpha.trim()!==""&&Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):opacity;setAlpha(String(next));if(next!==opacity)onOpacityChange(next)}return U.jsxs("div",{className:"grid-line-control",children:[U.jsx("label",{htmlFor:"grid-line-hex",children:"Цвет линий"}),U.jsxs("div",{className:"grid-line-row",children:[U.jsxs("div",{className:"grid-line-fields",children:[U.jsxs("div",{className:"grid-line-color",children:[U.jsx(Bf,{id:"grid-color",label:"Цвет линий",value:color,onChange:onColorChange}),U.jsx("input",{id:"grid-line-hex",className:"grid-line-hex","aria-label":"HEX цвета линий",type:"text",value:hex,maxLength:7,spellCheck:false,autoComplete:"off",onChange:event=>{const text=event.target.value.replace(/^#/,"").toUpperCase();setHex(text);if(/^[0-9A-F]{6}$/.test(text))onColorChange("#"+text)},onBlur:()=>setHex(color.slice(1).toUpperCase()),onKeyDown:event=>{if(event.key==="Enter")event.currentTarget.blur()}})]}),U.jsxs("div",{className:"grid-line-opacity",children:[U.jsx("input",{id:"grid-line-opacity","aria-label":"Непрозрачность линий",type:"number",inputMode:"numeric",min:0,max:100,step:1,value:alpha,onChange:event=>{const text=event.target.value;setAlpha(text);const n=Number(text);if(text!==""&&Number.isInteger(n)&&n>=0&&n<=100&&n!==opacity)onOpacityChange(n)},onBlur:commitAlpha,onKeyDown:event=>{if(event.key==="Enter")event.currentTarget.blur()}}),U.jsx("span",{"aria-hidden":"true",children:"%"})]})]}),U.jsx("button",{type:"button",className:"grid-visibility","aria-label":visible?"Скрыть сетку":"Показать сетку","aria-pressed":visible,title:visible?"Скрыть сетку":"Показать сетку",onClick:()=>onVisibleChange(!visible),children:U.jsxs("svg",{width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.6,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[U.jsx("path",{d:"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"}),U.jsx("circle",{cx:12,cy:12,r:3}),!visible&&U.jsx("path",{d:"m3 3 18 18"})]})})]})]})}`;
const heading = '" Показать"]})]}),';
const dimensionSliders = 'Ge("Колонки",f,1,10,at=>Ll(r,at)),Ge("Ряды",s,1,10,at=>Ll(h,at))';
const dimensionInputs = 'U.jsxs("div",{className:"grid-dimensions",children:[U.jsx(GridDimensionInput,{id:"grid-columns",label:"Колонки",value:f,onValueChange:at=>Ll(r,at)}),U.jsx(GridDimensionInput,{id:"grid-rows",label:"Ряды",value:s,onValueChange:at=>Ll(h,at)})]})';
const inputComponent = `function GridDimensionInput({id,label,value,onValueChange}){const[draft,setDraft]=O.useState(String(value));O.useEffect(()=>setDraft(String(value)),[value]);function commit(){const n=Number(draft),next=draft.trim()!==""&&Number.isFinite(n)?Math.max(1,Math.min(10,Math.round(n))):value;setDraft(String(next));if(next!==value)onValueChange(next)}return U.jsxs("div",{className:"grid-dimension",children:[U.jsx("label",{htmlFor:id,children:label}),U.jsx("input",{id,type:"number",inputMode:"numeric",min:1,max:10,step:1,value:draft,onChange:event=>{const text=event.target.value;setDraft(text);const n=Number(text);if(text!==""&&Number.isInteger(n)&&n>=1&&n<=10&&n!==value)onValueChange(n)},onBlur:commit,onKeyDown:event=>{if(event.key==="Enter")event.currentTarget.blur()}})]})}`;
const rules = `/* grid-controls:start */
#grid-settings .summary{margin-top:0;margin-bottom:12px}
#grid-settings .color-row{margin:12px 0}
.studio-slider-thumb{width:20px;height:14px}
.slider-glass-body{transform:translate(-50%,-50%)scale(.414)}
.glass-slider-shell[data-pressed=true] .slider-glass-body{transform:translate(-50%,-50%)scale(.648)}
.control-label{margin-bottom:0}
.studio-slider,.glass-slider-shell{height:30px}
@media(max-width:960px){.control{margin-top:12px}.studio-slider,.glass-slider-shell{height:34px}}
.toggle{gap:7px;cursor:pointer}
.toggle input{appearance:none;-webkit-appearance:none;width:16px;height:16px;flex-shrink:0;margin:0;border:1px solid #ffffff38;border-radius:5px;background:#ffffff08;cursor:pointer;transition:background-color .18s,border-color .18s,box-shadow .18s}
.toggle input:checked{border-color:#8323f1;background-color:#6500d8;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='m4 8 2.5 2.5L12 5' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-position:center;background-repeat:no-repeat;background-size:14px 14px;box-shadow:inset 0 1px 2px #ffffff24,0 1px 3px #0003}
.toggle:hover input{border-color:#ffffff70;background-color:#ffffff12}
.toggle:hover input:checked{border-color:#9c57f5;background-color:#760be8}
.toggle input:focus-visible{outline:2px solid #aa72ff;outline-offset:3px}
@media(max-width:960px){.toggle input{width:18px;height:18px}}
@media(prefers-reduced-motion:reduce){.toggle input{transition:none}}
.grid-dimensions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}
.grid-dimension{display:flex;flex-direction:column;gap:6px;min-width:0}
.grid-dimension label{color:#bcbcbc;font-size:10px;line-height:1.5}
.grid-dimension input{box-sizing:border-box;width:100%;min-width:0;height:36px;padding:0 10px;color:#fff;background:#222424;border:1px solid #ffffff20;border-radius:8px;font-family:AvitoSansTextMono,monospace;font-size:12px;font-weight:500;line-height:1.4;transition:border-color .18s,background-color .18s}
.grid-dimension input:hover{border-color:#ffffff40;background:#292a2a}
.grid-dimension input:focus{outline:2px solid #8323f1;outline-offset:1px;border-color:#8323f1}
@media(max-width:960px){.grid-dimension label{font-size:11px}.grid-dimension input{height:44px;font-size:16px}}
@media(prefers-reduced-motion:reduce){.grid-dimension input{transition:none}}
.grid-line-control{margin:12px 0}
.grid-line-control>label{display:block;margin-bottom:6px;color:#bcbcbc;font-size:10px;line-height:1.5}
.grid-line-fields{display:flex;align-items:center;height:36px;background:#222424;border:1px solid #ffffff20;border-radius:8px;overflow:hidden;transition:border-color .18s}
.grid-line-fields:hover{border-color:#ffffff40}
.grid-line-fields:focus-within{outline:2px solid #8323f1;outline-offset:1px;border-color:#8323f1}
.grid-line-color{display:flex;align-items:center;gap:8px;padding:0 8px;flex:1;min-width:0}
.grid-line-color .color-swatch{width:22px;height:22px;border-radius:5px;flex-shrink:0;border:1px solid #ffffff38}
.grid-line-color .color-swatch:focus-visible{outline:2px solid #aa72ff;outline-offset:2px}
.grid-line-fields input{width:100%;min-width:0;padding:0;margin:0;border:0;background:transparent;color:#fff;font-family:AvitoSansTextMono,monospace;font-size:12px;font-weight:400;line-height:1.4;height:34px;outline:none}
.grid-line-opacity{display:flex;align-items:center;gap:6px;flex:0 0 84px;padding:0 10px;border-left:1px solid #ffffff14;color:#aaa;font-family:AvitoSansTextMono,monospace;font-size:12px}
.grid-line-opacity input{text-align:right;appearance:textfield;-moz-appearance:textfield}
.grid-line-opacity input::-webkit-inner-spin-button,.grid-line-opacity input::-webkit-outer-spin-button{appearance:none;-webkit-appearance:none;margin:0}
@media(max-width:960px){.grid-line-control>label{font-size:11px}.grid-line-fields{height:44px}.grid-line-fields input{height:42px;font-size:16px}.grid-line-opacity{flex-basis:92px}.grid-line-color .color-swatch{width:26px;height:26px}}
@media(prefers-reduced-motion:reduce){.grid-line-fields{transition:none}}
.grid-line-row{display:flex;align-items:center;gap:8px}
.grid-line-row .grid-line-fields{flex:1;min-width:0}
aside .grid-visibility{display:flex;align-items:center;justify-content:center;flex:0 0 36px;width:36px;height:36px;padding:0;border:0;border-radius:8px;background:transparent;color:#bcbcbc;cursor:pointer;transition:color .18s,background-color .18s}
aside .grid-visibility[aria-pressed=true]{color:#fff}
aside .grid-visibility:hover{color:#fff;background:#ffffff0c}
aside .grid-visibility:focus-visible{outline:2px solid #8323f1;outline-offset:2px}
@media(max-width:960px){aside .grid-visibility{flex-basis:44px;width:44px;height:44px}}
@media(prefers-reduced-motion:reduce){aside .grid-visibility{transition:none}}
/* grid-controls:end */
`;
function layout(text) {
  text = text.replace(legacyLineControl, lineControl);
  const newHeading = '" Сетка "]}),' ;
  if (!text.includes('className:"grid-cell-count"') && !text.includes(newHeading + summary + ',' + lineControl + ',') && !text.includes(heading + summary + ',' + color + ',') && !text.includes(heading + summary + ',' + lineControl + ',')) {
    if (!text.includes(',' + summary) || !text.includes(color + ',') || !text.includes(heading)) throw new Error('Missing grid layout hook');
    text = text.replace(',' + summary, '').replace(color + ',', '').replace(heading, heading + summary + ',' + color + ',');
  }
  if (!text.includes('function GridDimensionInput(')) {
    if (!text.includes('function Hn(')) throw new Error('Missing component insertion hook');
    text = text.replace('function Hn(', inputComponent + 'function Hn(');
  }
  if (text.includes(dimensionSliders)) text = text.replace(dimensionSliders, dimensionInputs);
  if (!text.includes(dimensionInputs)) throw new Error('Missing grid dimension fields');
  if (text.includes('function GridLineControl(')) text = text.replace(/function GridLineControl\([\s\S]*?(?=function Hn\()/, () => lineComponent);
  else text = text.replace('function Hn(', lineComponent + 'function Hn(');
  text = text.replace(',U.jsxs("label",{className:"toggle",children:[U.jsx("input",{type:"checkbox",checked:v,onChange:at=>S(at.target.checked)})," Показать"]})', '');
  text = text.replace(color, lineControl).replace(',Ge("Непрозрачность",b,0,100,m,"%")', '');
  if (!text.includes(lineControl)) throw new Error('Missing combined line control');
  return text;
}
function styles(text) {
  text = text.replace(/\/\* grid-controls:start \*\/[\s\S]*?\/\* grid-controls:end \*\/\s*/g, '');
  const marker = '/* grid-clean-palette */';
  if (!text.includes(marker)) throw new Error('Missing palette stylesheet hook');
  return text.replace(marker, rules + '\n' + marker);
}
const runtime = new URL('assets/index-BwYdjEfo.js', `file://${root}`);
await fs.writeFile(runtime, layout(await fs.readFile(runtime, 'utf8')));
const css = new URL('assets/index-DlFOVRFE.css', `file://${root}`);
await fs.writeFile(css, styles(await fs.readFile(css, 'utf8')));
const offline = new URL('Grid Studio.html', `file://${root}`);
await fs.writeFile(offline, styles(layout(await fs.readFile(offline, 'utf8'))));
console.log('Updated grid control order and slider spacing in both versions.');
