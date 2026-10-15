import fs from'node:fs/promises';
// Same explicit packaging contract as the supplied workshop source, no effect rewriting.
let html=await fs.readFile('workshop-action/vendor/grid-original.html','utf8');
const config=JSON.parse(await fs.readFile('workshop-action/src/settings.json','utf8'));
function once(a,b){if(!html.includes(a))throw Error('Missing hook '+a);html=html.replace(a,b)}
once('size:preview?300:600,preview,interval:',`size:video?(preview?300:600):${config.imageRenderSize},preview,interval:`);
once('[actionAnimate,setActionAnimate]=O.useState(true)','[actionAnimate,setActionAnimate]=O.useState(false)');once('setActionAnimate(true),','setActionAnimate(false),');
const start='/* grid-video-render:start */',end='/* grid-video-render:end */',a=html.indexOf(start),b=html.indexOf(end,a);
html=html.slice(0,a)+start+await fs.readFile('workshop-action/src/render-loop.js','utf8')+end+html.slice(b+end.length);
if(html!==await fs.readFile('workshop-action/index.html','utf8'))throw Error('Rebuild differs');
await fs.writeFile('practice-prompts/three-cycles/cycle3-step3.html',html);
// Checkpoints retain the reference UI, while disabling unfinished Action operations.
for(const step of[1,2]){
 let checkpoint=html;
 if(step===1){checkpoint=checkpoint.replace(/function gb\(([^)]*)\)\{/, 'function gb($1){return null;');checkpoint=checkpoint.replaceAll('GridCleanStyle.applyBase(', '(()=>{} )(');}
 const controls=`<script>function lockWorkshop(){for(const name of ['Свечение','Интенсивность','Шлейф','Чёткая зона']){const n=document.querySelector('input[aria-label="'+name+' — значение"]');if(n){n.disabled=true;const row=n.closest('.slider-row')||n.parentElement.parentElement;row.style.pointerEvents='none';row.style.opacity='.45';row.querySelectorAll('input,button,[role=slider]').forEach(e=>{e.disabled=true;e.setAttribute('aria-disabled','true')})}}document.querySelectorAll('select,input[type=checkbox]').forEach(e=>e.disabled=true)}new MutationObserver(lockWorkshop).observe(document.body,{childList:true,subtree:true});lockWorkshop();</script>`;
 checkpoint=checkpoint.replace('</body>',controls+'</body>');await fs.writeFile('practice-prompts/three-cycles/cycle3-step'+step+'.html',checkpoint);
}
console.log('Cycle 3 rebuilt from template source; final HTML matches current workshop exactly.');
