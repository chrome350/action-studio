import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 const replace=(a,b)=>{if(!s.includes(a))throw Error('Missing video effects hook: '+a);s=s.replace(a,b)};
 if(!s.includes('availableEffects=mediaKind')){
  replace('[mediaKind,setMediaKind]=O.useState("image"),','');
  replace('[X,tt]=O.useState("clean"),P=ci.some(at=>at.mode===X)?X:"clean",[K,w]=O.useState({}),', '[mediaKind,setMediaKind]=O.useState("image"),availableEffects=mediaKind==="video"?ci.filter(effect=>effect.mode!=="ribbons"):ci,[X,tt]=O.useState("clean"),P=availableEffects.some(at=>at.mode===X)?X:"clean",[rawCells,w]=O.useState({}),K=O.useMemo(()=>mediaKind==="video"?Object.fromEntries(Object.entries(rawCells).map(([key,cell])=>[key,cell.mode==="ribbons"?{...cell,mode:"clean"}:cell])):rawCells,[rawCells,mediaKind]),');
  replace('chooseMixedEffect(ci.map(effect=>effect.mode)', 'chooseMixedEffect(availableEffects.map(effect=>effect.mode)');
  replace('children:ci.map(at=>U.jsx("option"','children:availableEffects.map(at=>U.jsx("option"');
  replace('},[et,dt,f,s]);function cn()', '},[et,dt,f,s,mediaKind]);function cn()');
 }
 await fs.writeFile(file,s);
}
console.log('Ribbons restricted to images in selection, mixed cells and random cycle.');
