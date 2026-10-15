import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const avito = 'data:image/svg+xml;base64,' + (await fs.readFile(new URL('assets/avito-wordmark.svg', root))).toString('base64');
const action = 'data:image/svg+xml;base64,' + (await fs.readFile(new URL('assets/action-wordmark.svg', root))).toString('base64');
const header = `U.jsxs("header",{children:[U.jsx("img",{ref:Ke,className:"brand-logo brand-logo-left",src:${JSON.stringify(avito)},alt:"AVITO",draggable:!1}),U.jsx("img",{className:"brand-logo brand-logo-right",src:${JSON.stringify(action)},alt:"ACTION!",draggable:!1})]}),`;
for (const name of ['assets/index-BwYdjEfo.js', 'Grid Studio.html']) {
 const file = new URL(name, root); let text = await fs.readFile(file, 'utf8');
 const pattern = /U\.jsxs\("header",\{children:\[[\s\S]*?(?=U\.jsxs\("div",\{className:"editor-layout")/;
 if (!pattern.test(text)) throw Error('Missing header');
 text = text.replace(pattern, () => header);
 await fs.writeFile(file, text);
}
const css = `
/* grid-header-logos:start */
header{flex-direction:row;justify-content:space-between;align-items:center}
@media(min-width:961px){header{padding-top:20px;padding-bottom:12px;padding-left:20px}}
header .brand-logo{display:block;height:40px;width:auto;flex-shrink:0}
@media(max-width:960px){header{flex-direction:row;justify-content:space-between;align-items:center}header .brand-logo{height:32px}}
/* grid-header-logos:end */
`;
for (const name of ['assets/index-DlFOVRFE.css', 'Grid Studio.html']) {
 const file = new URL(name, root); let text = await fs.readFile(file, 'utf8');
 text = text.replace(/\n?\/\* grid-header-logos:start \*\/[\s\S]*?\/\* grid-header-logos:end \*\//g, '');
 await fs.writeFile(file, name.endsWith('.css') ? text + css : text.replace('</style>', css + '</style>'));
}
