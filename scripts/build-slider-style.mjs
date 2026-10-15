import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const css = await fs.readFile(new URL('../design-system/sliders.css', import.meta.url), 'utf8');
for (const name of ['assets/index-DlFOVRFE.css', 'Grid Studio.html']) {
 const file = new URL(name, root);
 let text = await fs.readFile(file, 'utf8');
 text = text.replace(/\n?\/\* grid-slider-style:start \*\/[\s\S]*?\/\* grid-slider-style:end \*\//g, '');
 await fs.writeFile(file, name.endsWith('.css') ? text + css : text.replace('</style>', css + '</style>'));
}
