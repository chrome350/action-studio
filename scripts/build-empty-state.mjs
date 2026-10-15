import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const hook = 'children:[U.jsx("canvas",{ref:Be,width:600,height:600,';
const replacement = 'children:[!rt&&U.jsx("div",{className:"empty-stage",children:U.jsxs(ri,{size:"sm",type:"button",className:"empty-stage-upload liquid-button-primary",onClick:()=>nt.current?.click(),children:[U.jsx(_S,{size:14}),"Загрузить файл"]})}),U.jsx("canvas",{ref:Be,width:600,height:600,';
for (const name of ['assets/index-BwYdjEfo.js', 'Grid Studio.html']) {
 const file = new URL(name, root);
 let text = await fs.readFile(file, 'utf8');
 text = text.replace('U.jsxs("button",{type:"button",className:"empty-stage-upload"', 'U.jsxs(ri,{size:"sm",type:"button",className:"empty-stage-upload liquid-button-primary"');
 text = text.replace('[rt,_t]=O.useState(bb)', '[rt,_t]=O.useState("")');
 if (!text.includes('className:"empty-stage"')) {
  if (!text.includes(hook)) throw new Error('Missing stage hook');
  text = text.replace(hook, replacement);
 }
 // Keep the menu order and empty-state actions consistent in both distributions.
 text = text.replace(/ci=\[([\s\S]*?)\];function Gf/, (match, body) => {
  const effects = body.match(/\{mode:[\s\S]*?\}/g);
  if (!effects || effects.length !== 4) throw new Error('Unexpected effect menu');
  effects.sort((a,b)=>Number(b.includes('mode:"clean"'))-Number(a.includes('mode:"clean"')));
  return 'ci=['+effects.join(',')+'];function Gf';
 });
 const start=text.indexOf('className:"bottom-actions"'),end=text.indexOf('U.jsxs("aside"',start);
 if(start<0||end<0)throw new Error('Missing bottom actions');
 let actions=text.slice(start,end);
 actions=actions.replace('size:"sm","aria-label":"Случайный цикл"','size:"sm",disabled:!rt,"aria-label":"Случайный цикл"')
 .replace('disabled:videoTools.recording','disabled:!rt||videoTools.recording')
 .replace('disabled:!videoTools.status.ready','disabled:!rt||!videoTools.status.ready')
 .replace('disabled:mediaKind===','disabled:!rt||mediaKind===');
 text=text.slice(0,start)+actions+text.slice(end);
 text=text.replace('function cn(){if(videoTools.isRecording())','function cn(){if(!Ft.current||videoTools.isRecording())')
 .replace('function ul(){if(!et)', 'function ul(){if(!Ft.current)return;if(!et)')
 .replace('async function va(){if(Ft.current?.tagName', 'async function va(){if(!Ft.current)return;if(Ft.current?.tagName');
 await fs.writeFile(file, text);
}
const css = await fs.readFile(new URL('../design-system/empty-state.css', import.meta.url), 'utf8');
for (const name of ['assets/index-DlFOVRFE.css', 'Grid Studio.html']) {
 const file = new URL(name, root);
 let text = await fs.readFile(file, 'utf8');
 text = text.replace(/\n?\/\* grid-empty-state:start \*\/[\s\S]*?\/\* grid-empty-state:end \*\//g, '');
 await fs.writeFile(file, name.endsWith('.css') ? text + css : text.replace('</style>', css + '</style>'));
}
