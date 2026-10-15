import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const css = `
/* grid-stage-layout:start */
@media(min-width:961px){
  /* Reserve 52px for the dock, 24px below it and a 12px image gap.
     Let the top margin collapse before the fixed-size canvas overlaps it. */
  .canvas-area{padding:clamp(0px,calc(100dvh - 760px),20px) 20px 88px;grid-template-rows:minmax(0,1fr);align-items:safe center}
}
/* grid-stage-layout:end */
`;
for (const name of ['assets/index-DlFOVRFE.css', 'Grid Studio.html']) {
  const file = new URL(name, root);
  let text = await fs.readFile(file, 'utf8');
  text = text.replace(/\n?\/\* grid-stage-layout:start \*\/[\s\S]*?\/\* grid-stage-layout:end \*\//g, '');
  await fs.writeFile(file, name.endsWith('.css') ? text + css : text.replace('</style>', css + '</style>'));
}
console.log('Updated responsive canvas spacing in hosted and offline versions.');
