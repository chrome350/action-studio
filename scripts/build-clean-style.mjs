// This checkout contains the static runtime. Patch only the light module and UI defaults,
// preserving the existing mobile layout, export bridge and offline assets.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require(process.env.GRID_ESBUILD_PATH || 'esbuild');
const result = await esbuild.build({ entryPoints: [path.join(root, 'source/clean-effect.ts')], bundle: true, write: false, format: 'iife', globalName: 'GridCleanStyle', minify: true, target: 'es2022' });
const module = `/* grid-clean-style:start */${result.outputFiles[0].text.trim()}/* grid-clean-style:end */`;
const ui = 'U.jsx("div",{className:"palette-presets",role:"group","aria-label":"Палитра Конфа 26",children:GridCleanStyle.PRESETS.map(at=>U.jsxs("button",{type:"button",className:"palette-preset","aria-label":`Палитра: ${at.name}`,"aria-pressed":B.toUpperCase()===at.ink&&Z.toUpperCase()===at.paper,onClick:()=>{F(at.ink),k(at.paper),L(0)},children:[U.jsx("span",{className:"palette-preset-dot",style:{background:at.paper},"aria-hidden":"true"}),at.name]},at.name))}),';
function replaceOnce(text, from, to) {
  if (!text.includes(from)) throw new Error(`Missing runtime hook: ${from.slice(0, 70)}`);
  return text.replace(from, to);
}
function patch(text) {
  text = text.replace(/\/\* grid-clean-style:start \*\/[\s\S]*?\/\* grid-clean-style:end \*\//, '');
  if (!text.includes('function gb(') || !text.includes('function yb(')) throw new Error('Missing glow functions');
  text = text.replace(/function gb\([\s\S]*?(?=function yb\()/, module + 'function gb(i,o,f,r,s,h,a,b,c,d,e,g,n){return GridCleanStyle.prepare(i,o,f,r,s,h,qf,a,b,c,d,e,g,n)}');
  text = text.replace(/function yb\([\s\S]*?(?=const bb=)/, 'function yb(i,o,f,r,s){GridCleanStyle.draw(i,o,f,r,s)}');
  text = text.replaceAll('#2B1F17', '#07080B').replaceAll('#E4D4B6', '#FFFFFF');
  text = text.replace('Ih={clean:12,', 'Ih={clean:18,').replace('[Q,Ut]=O.useState(85)', '[Q,Ut]=O.useState(80)').replace('[Lt,It]=O.useState(16)', '[Lt,It]=O.useState(8)');
  text = text.replace('ct(Ih),Ut(85),It(16)', 'ct(Ih),Ut(80),It(8)');
  text = text.replace('label:"Чистое",description:"Плавная смесь краски и бумаги со свечением контуров."', 'label:"Чистый",description:"Светлое ядро, цветные ореолы и мягкие засветы ярких участков."');
  text = text.replace(/U\.jsxs\("div",\{className:"color-row",children:\[U\.jsx\("label",\{htmlFor:"ink-color"[\s\S]*?(?=Ge\("Контраст")/, '');
  text = text.replace(',Ge("Гамма",j,.2,3,at=>I(Number(at.toFixed(2))),"",.05)', '');
  text = text.replace('Ge("Яркость",Y,0,200,V,"%")]}),U.jsxs("section",{className:"panel-section",children:[U.jsx("h2",{children:"Два цвета"})', 'Ge("Яркость",Y,0,200,V,"%"),U.jsxs("div",{className:"image-colors",children:[U.jsx("h3",{children:"Два цвета"})');
  if (text.includes('className:"image-colors"')) text = text.replace('Ge("Контраст",W,0,300,yt,"%")]}),U.jsxs("section"', 'Ge("Контраст",W,0,300,yt,"%")]})]}),U.jsxs("section"');
  text = text.replace('Ge("Яркость",Y,0,200,V,"%"),U.jsxs("div",{className:"image-colors"', 'Ge("Яркость",Y,0,200,V,"%"),Ge("Контраст",W,0,300,yt,"%"),U.jsxs("div",{className:"image-colors"');
  text = text.replace('},at.name))}),Ge("Контраст",W,0,300,yt,"%")]})]})', '},at.name))})]})]})');
  text = text.replace('ol.mode==="clean"&&ob(cl.data,B,Z,W/100,j)', 'ol.mode==="clean"&&GridCleanStyle.applyBase(cl.data,B,W/100,j)');
  text = text.replace('gb(vi.data,600,600,J.clean,W/100,j)', 'gb(vi.data,600,600,J.clean,W/100,j,Z)');
  text = text.replace('!Je||!ib(cl.data,W/100,j)', '!Je||(!ib(cl.data,W/100,j)&&(K[kt*f+ne]?.mode||P)!=="clean")');
  if (!text.includes('ib(cl.data,W/100,j)&&gi.push')) text = text.replace('gi.push(kt*f+ne);', 'ib(cl.data,W/100,j)&&gi.push(kt*f+ne);');
  text = text.replace('Ih={clean:18,', 'Ih={clean:24,').replace('[Lt,It]=O.useState(8)', '[Lt,It]=O.useState(16)').replace('ct(Ih),Ut(80),It(8)', 'ct(Ih),Ut(80),It(16)');
  text = text.replaceAll('label:"Чистый"', 'label:"Action"');
  text = text.replace('gb(vi.data,600,600,J.clean,W/100,j,Z)', 'gb(vi.data,600,600,J.clean,W/100,j,Z,B,Q,Lt,Je.naturalWidth,Je.naturalHeight)');
  text = text.replace('Mt.clip(Me),Mt.globalCompositeOperation="screen",Mt.drawImage(qe,0,0)', 'Mt.clip(Me),Mt.globalCompositeOperation="source-over",Mt.drawImage(qe,0,0)');
  text = text.replace('description:"Светлое ядро, цветные ореолы и мягкие засветы ярких участков."', 'description:"Спектральное растяжение, цветные засветы и красноватые тени."');
  if (!text.includes('[actionClarity,setActionClarity]')) {
    text = replaceOnce(text, '[Lt,It]=O.useState(16),', '[Lt,It]=O.useState(16),[actionClarity,setActionClarity]=O.useState(16),');
    text = replaceOnce(text, 'Je.naturalWidth,Je.naturalHeight):null', 'Je.naturalWidth,Je.naturalHeight,actionClarity):null');
    text = replaceOnce(text, '[f,s,v,T,b,x,Y,W,B,Z,j,rt,P,J,K,Q,Lt]', '[f,s,v,T,b,x,Y,W,B,Z,j,rt,P,J,K,Q,Lt,actionClarity]');
    text = replaceOnce(text, 'ct(Ih),Ut(80),It(16),y.current=0', 'ct(Ih),Ut(80),It(16),setActionClarity(16),y.current=0');
    text = replaceOnce(text, 'Ge("Шлейф движения",Lt,0,40,at=>{It(at),L(0)}," px")', 'Ge("Шлейф движения",Lt,0,40,at=>{It(at),L(0)}," px"),Ge("Размер чёткой зоны",actionClarity,0,100,at=>{setActionClarity(at),L(0)},"%")');
  }
  const colorPanel = ',U.jsxs("div",{className:"image-colors",children:[U.jsx("h3",{children:"Два цвета"}),' + ui.slice(0, -1) + ']})';
  text = text.replace(colorPanel, '');
  return text;
}
for (const name of ['assets/index-BwYdjEfo.js', 'Grid Studio.html']) {
  const file = path.join(root, name); await fs.writeFile(file, patch(await fs.readFile(file, 'utf8')));
}
const css = `\n/* grid-clean-palette */\n.image-colors{margin-top:24px}.image-colors h3{margin:0 0 16px;letter-spacing:0;font-family:AvitoSansDisplay,sans-serif;font-size:13px;font-weight:400;line-height:1.4}@media(max-width:960px){.image-colors h3{font-size:14px}}.palette-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:0 0 20px}.palette-preset{display:flex;align-items:center;justify-content:flex-start;gap:6px;min-height:36px;padding:8px;border:1px solid #ffffff20;border-radius:10px;color:#bcbcbc;background:#ffffff04;font-size:9px;cursor:pointer}.palette-preset:hover{background:#ffffff0c;color:#fff}.palette-preset[aria-pressed=true]{border-color:#ffffff70;color:#fff;background:#ffffff10}.palette-preset:focus-visible{outline:2px solid #34a4fa;outline-offset:2px}.palette-preset-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;box-shadow:0 0 0 1px #ffffff30}@media(max-width:960px){.palette-preset{min-height:44px;font-size:11px}}\n`;
const cssFile = path.join(root, 'assets/index-DlFOVRFE.css');
let styles = await fs.readFile(cssFile, 'utf8');
styles = styles.replace(/\n\/\* grid-clean-palette \*\/[\s\S]*$/, '') + css;
await fs.writeFile(cssFile, styles);
const offlineFile = path.join(root, 'Grid Studio.html');
let offline = await fs.readFile(offlineFile, 'utf8');
offline = offline.replace(/\n\/\* grid-clean-palette \*\/[\s\S]*?(?=<\/style>)/, '');
offline = offline.replace('</style>', css + '</style>');
await fs.writeFile(offlineFile, offline);
console.log('Updated the hosted runtime and self-contained offline HTML.');
await import('./build-fonts.mjs');
await import('./build-grid-controls.mjs');
await import('./build-dot-matrix.mjs');
await import('./build-compact-panel.mjs');

await import('./build-ribbon-stretch.mjs');
await import('./build-letters-color.mjs');
await import('./build-random-mix.mjs');
await import('./build-transitions.mjs');

await import('./build-letters-interaction.mjs');

await import('./build-video.mjs');

await import('./build-video-performance.mjs');
await import('./build-adaptive-tone.mjs');
await import('./build-video-cycle.mjs');

await import('./build-video-effects.mjs');

await import('./build-gradient-picker.mjs');

await import('./build-watermark.mjs');

await import('./build-checkboxes.mjs');

await import('./build-action-animation.mjs');
