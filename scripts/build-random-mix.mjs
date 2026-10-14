import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=(await fs.readFile(new URL('source/random-mix.js',root),'utf8')).replace('export function','function');
const module=`/* grid-random-mix:start */${source}/* grid-random-mix:end */`;
function replace(s,a,b){if(!s.includes(a))throw Error('Missing random mix hook: '+a);return s.replace(a,b)}
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 if(s.includes('/* grid-random-mix:start */'))s=s.replace(/\/\* grid-random-mix:start \*\/[\s\S]*?\/\* grid-random-mix:end \*\//,module);
 else{
  s=replace(s,'function MS(){',module+'function MS(){');
  s=replace(s,'function Bt(at){const bt=ci.filter(Rt=>Rt.mode!==at).flatMap(({mode:Rt})=>Rt==="clean"?[Rt,Rt,Rt]:[Rt]);return bt[Math.floor(Math.random()*bt.length)]}', 'function Bt(previous,cells,index){return chooseMixedEffect(ci.map(effect=>effect.mode),cells,index,f,previous)}');
  s=replace(s,'const at={};for(const bt of Xt.current)at[bt]={mode:Bt()};','const at={},order=[...Xt.current];for(let n=order.length-1;n>0;n--){const j=Math.floor(Math.random()*(n+1));[order[n],order[j]]=[order[j],order[n]]}for(const bt of order)at[bt]={mode:Bt(undefined,at,bt)};');
  s=replace(s,'mode:Bt(Me[oe]?.mode)','mode:Bt(Me[oe]?.mode,Me,oe)');
 }
 await fs.writeFile(file,s);
}
console.log('Neighbour-aware random mix updated in both builds.');
