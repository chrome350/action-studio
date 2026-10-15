import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const css = await fs.readFile(new URL('../design-system/checkboxes.css', import.meta.url), 'utf8');
for(const name of ['assets/index-DlFOVRFE.css','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');s=s.replace(/\n?\/\* grid-checkboxes:start \*\/[\s\S]*?\/\* grid-checkboxes:end \*\//g,'');
 await fs.writeFile(file,name.endsWith('.css')?s+css:s.replace('</style>',css+'</style>'));
}
console.log('Shared purple checkbox styling updated in web and offline builds.');
