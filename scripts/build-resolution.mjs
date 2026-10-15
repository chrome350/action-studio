// Patch only output/transition raster sizes. CSS and 600-unit interaction
// coordinates remain unchanged; the renderer scales those to native pixels.
import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let text=await fs.readFile(file,'utf8');
 text=text.replaceAll('ref:Be,width:600,height:600','ref:Be,width:1080,height:1080').replaceAll('ref:H,width:600,height:600','ref:H,width:1080,height:1080');
 const start=text.indexOf('function captureEffectFade('),end=text.indexOf('function Bt(',start);
 if(start<0||end<0)throw Error('Missing transition raster hook');
 const capture=text.slice(start,end).replaceAll('600','1080');
 text=text.slice(0,start)+capture+text.slice(end);
 await fs.writeFile(file,text);
}
console.log('Native 1080px main and transition canvases updated.');
