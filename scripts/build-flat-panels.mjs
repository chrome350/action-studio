import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const css = `
/* grid-flat-panels:start */
aside,.stage,.bottom-actions,aside .panel-title,aside .panel-title.is-scrolled{box-shadow:none}
/* grid-flat-panels:end */
`;
for (const name of ['assets/index-DlFOVRFE.css', 'Grid Studio.html']) {
  const file = new URL(name, root);
  let text = await fs.readFile(file, 'utf8');
  text = text.replace(/\n?\/\* grid-flat-panels:start \*\/[\s\S]*?\/\* grid-flat-panels:end \*\//g, '');
  await fs.writeFile(file, name.endsWith('.css') ? text + css : text.replace('</style>', css + '</style>'));
}
