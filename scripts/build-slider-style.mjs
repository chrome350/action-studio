import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const css = `
/* grid-slider-style:start */
/* Share the neutral liquid button material across every slider state. */
.glass-slider-shell .slider-glass-body{background:#ffffff08;box-shadow:0 2px 5px #0003,0 0 0 1px #0003}
.glass-slider-shell .slider-glass-surface,
.glass-slider-shell[data-glass-active=true] .slider-glass-surface{background:linear-gradient(160deg,#ffffffb3 0%,#ffffff66 28%,#ffffff26 55%,#ffffff4d 78%,#ffffff80 100%);box-shadow:inset 0 1px 1px #ffffffd9,inset 1px 0 2px #ffffff40,inset -1px 0 2px #ffffff40,inset 0 -1px 1px #0009,inset 0 2px 5px #ffffff18,inset 0 -3px 6px #ffffff12}
.glass-slider-shell:hover .slider-glass-body{background:#ffffff12}
.glass-slider-shell:hover .slider-glass-surface,
.glass-slider-shell[data-pressed=true] .slider-glass-surface,
.glass-slider-shell[data-force-pressed=true] .slider-glass-surface{box-shadow:inset 0 1px 2px #ffffffb3,inset 1px 0 3px #ffffff50,inset -1px 0 3px #ffffff50,inset 0 -1px 1px #0009,inset 0 3px 7px #ffffff20,inset 0 -3px 7px #ffffff18}
/* grid-slider-style:end */
`;
for (const name of ['assets/index-DlFOVRFE.css', 'Grid Studio.html']) {
 const file = new URL(name, root);
 let text = await fs.readFile(file, 'utf8');
 text = text.replace(/\n?\/\* grid-slider-style:start \*\/[\s\S]*?\/\* grid-slider-style:end \*\//g, '');
 await fs.writeFile(file, name.endsWith('.css') ? text + css : text.replace('</style>', css + '</style>'));
}
