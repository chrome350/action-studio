import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),source=await fs.readFile(new URL('source/gradient-picker.js',root),'utf8');
const module=`/* grid-gradient-picker:start */${source}/* grid-gradient-picker:end */`;
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 if(s.includes('/* grid-gradient-picker:start */'))s=s.replace(/\/\* grid-gradient-picker:start \*\/[\s\S]*?\/\* grid-gradient-picker:end \*\//,module);
 else s=s.replace('function MS(){',module+'function MS(){');
 s=s.replaceAll('DotMatrixPalettes[1]','DotMatrixPalettes.find(p=>p.id==="confa")');
 const start=s.indexOf('U.jsx("label",{htmlFor:"letters-palette"');
 if(start>=0){const end=s.indexOf('P==="dotmatrix"&&U.jsxs',start);if(end<0)throw Error('Missing Letters gradient end');s=s.slice(0,start)+'U.jsx(GradientPicker,{id:"letters-palette",label:"Градиент",value:lettersPalette,onChange:value=>{setLettersPalette(value);L(0);_e.current=false;ye(false)}})]}),'+s.slice(end)}
 const dot=s.indexOf('P==="dotmatrix"&&U.jsxs("div",{className:"dot-palette-control"');
 const end=s.indexOf('qn.sizeLabel&&Ge(',dot);if(dot<0||end<0)throw Error('Missing Dot Matrix palette');
 s=s.slice(0,dot)+'P==="dotmatrix"&&U.jsxs("div",{className:"dot-palette-control",children:[U.jsx(GradientPicker,{id:"dot-palette",label:"Градиент точек",value:dotPalette,onChange:value=>{const preset=DotMatrixPalettes.find(p=>p.id===value);if(preset){setDotPalette(value);setDotColors(preset.colors);L(0)}}}),U.jsxs("label",{style:{display:"flex",alignItems:"center",gap:8,marginTop:12},children:[U.jsx("input",{type:"checkbox",checked:dotAnimate,onChange:e=>setDotAnimate(e.target.checked),"aria-label":"Анимация градиента"}),"Анимация градиента"]})]}),'+s.slice(end);
 await fs.writeFile(file,s);
}
const css=`\n/* grid-gradient-picker:start */
.gradient-control{display:grid;gap:8px;margin-top:16px}.gradient-field{width:100%;min-height:44px;display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid transparent;border-radius:10px;background:#222424;color:#fff;text-align:left;font:inherit;cursor:pointer}.gradient-swatch{width:24px;height:24px;border-radius:5px;flex-shrink:0;box-shadow:inset 0 0 0 1px #ffffff18}.gradient-name{flex:1;min-width:0;font-size:12px}.gradient-field>svg{color:#aaa;flex-shrink:0}.gradient-field:hover,.gradient-field[aria-expanded=true]{border-color:transparent}.gradient-field:focus-visible,.gradient-popup button:focus-visible{outline:2px solid #a100ff;outline-offset:2px}.gradient-popup{position:fixed;z-index:1000;box-sizing:border-box;padding:16px;background:#2b2c2c;border:1px solid #ffffff26;border-radius:14px;box-shadow:0 12px 40px #0008;color:#eee;font:13px AvitoSansText,sans-serif;overflow:auto}.gradient-popup-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.gradient-popup-heading strong{font-size:14px;font-weight:500}.gradient-popup-heading button{border:0;background:transparent;color:#aaa;width:28px;height:28px;font-size:23px;cursor:pointer}.gradient-preview{height:48px;border-radius:7px;margin-bottom:12px}.gradient-options{display:grid;gap:4px}.gradient-options button{display:grid;grid-template-columns:48px minmax(0,1fr) 16px;align-items:center;gap:10px;min-height:44px;width:100%;padding:8px;border:1px solid transparent;background:transparent;border-radius:8px;color:inherit;text-align:left;font:inherit;cursor:pointer}.gradient-options button:hover{background:#ffffff08}.gradient-options button[aria-checked=true]{background:#ffffff0b;border-color:#ffffff30}.gradient-option-swatch{height:24px;border-radius:4px;box-shadow:inset 0 0 0 1px #ffffff20}
/* grid-gradient-picker:end */\n`;
for(const name of ['assets/index-DlFOVRFE.css','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');s=s.replace(/\n?\/\* grid-gradient-picker:start \*\/[\s\S]*?\/\* grid-gradient-picker:end \*\//g,match=>match.includes('function GradientPicker')?match:'');
 s=name.endsWith('.css')?s+css:s.replace('</style>',css+'</style>');await fs.writeFile(file,s);
}
console.log('Shared swatch gradient picker updated in web and offline builds.');
