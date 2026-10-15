import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 if(!s.includes('[actionAnimate,setActionAnimate]')){
  s=s.replace('[actionClarity,setActionClarity]=O.useState(16),','[actionClarity,setActionClarity]=O.useState(16),[actionAnimate,setActionAnimate]=O.useState(true),[actionSpeed,setActionSpeed]=O.useState(100),');
  s=s.replace('setActionClarity(16),','setActionClarity(16),setActionAnimate(true),setActionSpeed(100),');
  const hook='P==="clean"&&U.jsxs(U.Fragment,{children:[';
  if(!s.includes(hook))throw Error('Missing Action controls');
  s=s.replace(hook,hook+'U.jsxs("label",{className:"action-animation-toggle",style:{display:"flex",alignItems:"center",gap:8,marginBottom:16},children:[U.jsx("input",{type:"checkbox",checked:actionAnimate,onChange:e=>setActionAnimate(e.target.checked)}),"Анимация свечения"]}),actionAnimate&&Ge("Скорость",actionSpeed,25,200,setActionSpeed,"%"),');
 }
 await fs.writeFile(file,s);
}
console.log('Action glow animation controls updated.');
