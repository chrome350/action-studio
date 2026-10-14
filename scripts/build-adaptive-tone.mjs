import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),source=(await fs.readFile(new URL('source/adaptive-tone.js',root),'utf8')).replaceAll('export function','function');
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 const module=`/* grid-adaptive-tone:start */${source}/* grid-adaptive-tone:end */`;
 if(s.includes('/* grid-adaptive-tone:start */'))s=s.replace(/\/\* grid-adaptive-tone:start \*\/[\s\S]*?\/\* grid-adaptive-tone:end \*\//,module);
 else s=s.replace('function MS(){',module+'function MS(){');
 const start=s.indexOf('function mb('),end=s.indexOf('function qf(',start);if(start<0||end<0)throw Error('Missing Letters renderer');
 let renderer=s.slice(start,end);
 renderer=renderer.replace('Y=cb(o,S,T)','Y=letterColor?.profile?gridLettersMask(o,letterColor.profile,S,T):cb(o,S,T)')
 .replace('Xt+=(.2126*o[Lt]+.7152*o[Lt+1]+.0722*o[Lt+2])/255','Xt+=Math.sqrt(.299*o[Lt]**2+.587*o[Lt+1]**2+.114*o[Lt+2]**2)/255');
 s=s.slice(0,start)+renderer+s.slice(end);await fs.writeFile(file,s);
}
console.log('Adaptive Letters visibility and video tone updated.');
