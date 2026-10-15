import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const files=['tokens','buttons','fields','sliders','checkboxes','panels','empty-state','media','typography','modal','bubbles'];
const css='\n/* grid-design-system:start */\n'+(await Promise.all(files.map(n=>fs.readFile(new URL(`design-system/${n}.css`,root),'utf8')))).join('\n')+'\n/* grid-design-system:end */\n';
for(const name of ['assets/index-DlFOVRFE.css','Grid Studio.html']){
 const file=new URL(name,root);let text=await fs.readFile(file,'utf8');
 text=text.replace(/\n?\/\* grid-design-system:start \*\/[\s\S]*?\/\* grid-design-system:end \*\//g,'');
 for(const marker of ['slider-style','checkboxes','flat-panels','empty-state'])text=text.replace(new RegExp('\\n?/\\* grid-'+marker+':start \\*/[\\s\\S]*?/\\* grid-'+marker+':end \\*/','g'),'');
 await fs.writeFile(file,name.endsWith('.css')?text.trimEnd()+css:text.replace(/\s*<\/style>/,css+'</style>'));
}
console.log('Shared design system applied to web and offline editor.');

const galleryStyles=(await Promise.all(['tokens','buttons','modal','bubbles'].map(n=>fs.readFile(new URL(`design-system/${n}.css`,root),'utf8')))).join('\n');
await fs.writeFile(new URL('gallery-prototype/design-system.css',root),galleryStyles);
