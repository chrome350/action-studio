import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const weights = { Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900 };
const families = ['AvitoSansText', 'AvitoSansTextMono', 'AvitoSansDisplay'];
const files = (await fs.readdir(path.join(root, 'fonts'))).filter(name => /^AvitoSans.*\.woff2?$/.test(name)).sort();
const fonts = await Promise.all(files.map(async name => {
  const [family, style] = name.replace(/\.woff2?$/, '').split('-');
  if (!families.includes(family) || !weights[style]) throw new Error(`Unknown font: ${name}`);
  return { name, family, weight: weights[style], format: name.endsWith('.woff2') ? 'woff2' : 'woff', data: await fs.readFile(path.join(root, 'fonts', name)) };
}));
if (fonts.length !== 18) throw new Error('Expected all 18 supplied Avito Sans font files.');

const rules = `
:root,main,.color-picker-popup{font-family:AvitoSansText,sans-serif}
.brand,.panel-title strong,.panel-section h2{font-family:AvitoSansDisplay,sans-serif}
.control-label output,.glass-slider-end,.color-row code,.summary,.color-picker-popup input,input[type=number]{font-family:AvitoSansTextMono,monospace;font-variant-numeric:tabular-nums}
`;
function update(styles, embedded) {
  styles = styles.replace(/\/\* grid-avito-fonts:start \*\/[\s\S]*?\/\* grid-avito-fonts:end \*\/\s*/g, '');
  styles = styles.replace(/@font-face\{font-family:Unbounded;[^}]*\}/g, '');
  styles = styles.replaceAll('font-family:Unbounded,sans-serif', 'font-family:AvitoSansText,sans-serif');
  styles = styles.replace('font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif', 'font-family:AvitoSansText,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif');
  const faces = fonts.map(font => {
    const url = embedded ? `data:font/${font.format};base64,${font.data.toString('base64')}` : `../fonts/${font.name}`;
    return `@font-face{font-family:${font.family};src:url("${url}") format("${font.format}");font-style:normal;font-weight:${font.weight};font-display:swap}`;
  }).join('\n');
  const block = `/* grid-avito-fonts:start */\n${faces}\n${rules}/* grid-avito-fonts:end */\n`;
  const marker = '/* grid-clean-palette */';
  return styles.includes(marker) ? styles.replace(marker, block + '\n' + marker) : styles + '\n' + block;
}
const cssPath = path.join(root, 'assets/index-DlFOVRFE.css');
await fs.writeFile(cssPath, update(await fs.readFile(cssPath, 'utf8'), false));
const offlinePath = path.join(root, 'Grid Studio.html');
const offline = await fs.readFile(offlinePath, 'utf8');
if (!/<style[^>]*>[\s\S]*?<\/style>/.test(offline)) throw new Error('Missing offline stylesheet.');
await fs.writeFile(offlinePath, offline.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/, (_, start, styles, end) => start + update(styles, true) + end));
console.log('Updated Avito Sans fonts in hosted and offline styles.');
