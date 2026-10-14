import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=(await fs.readFile(new URL('source/circle-packing.js',root),'utf8')).replace('export function','function');
const module=`/* grid-circle-packing:start */${source}/* grid-circle-packing:end */`;
function replace(s,a,b){if(!s.includes(a))throw Error('Missing circle packing hook: '+a.slice(0,90));return s.replace(a,b)}
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 if(s.includes('/* grid-circle-packing:start */'))s=s.replace(/\/\* grid-circle-packing:start \*\/[\s\S]*?\/\* grid-circle-packing:end \*\//,module);
 else{
  s=replace(s,'function MS(){',module+'function MS(){');
  s=replace(s,'Ih={','Ih={circlepack:44,');
  s=replace(s,'ci=[','ci=[{mode:"circlepack",label:"Circle Packing",description:"Редкие контурные круги разного размера внутри силуэта.",sizeLabel:"Лимит кругов"},');
  s=replace(s,'const dotMatrixImage=', 'const circlePackingImage=Je&&(P==="circlepack"||Object.values(K).some(cell=>cell.mode==="circlepack"))?renderCirclePacking(Mt.getImageData(0,0,600,600).data,600,600,J.circlepack):null;const dotMatrixImage=');
  s=replace(s,'cl=Mt.getImageData(Zt,il,Ie,Ne);if(', 'cl=Mt.getImageData(Zt,il,Ie,Ne);if((K[kt*f+ne]?.mode||P)==="circlepack"){if(circlePackingImage){Mt.drawImage(circlePackingImage,Zt,il,Ie,Ne,Zt,il,Ie,Ne);ib(cl.data,W/100,j)&&gi.push(kt*f+ne)}else{Mt.fillStyle="#000";Mt.fillRect(Zt,il,Ie,Ne)}continue}if(');
  s=replace(s,'Ge(qn.sizeLabel,Sl.size,P==="dotmatrix"?4:2,60,at=>Yn({size:at})," px")','Ge(qn.sizeLabel,Sl.size,P==="circlepack"?16:P==="dotmatrix"?4:2,P==="circlepack"?80:60,at=>Yn({size:at}),P==="circlepack"?"":" px")');
 }
 s=s.replace('sizeLabel:"Количество кругов"','sizeLabel:"Лимит кругов"');
 s=s.replace(/circlepack:(?:44|80),/,'circlepack:120,').replace('P==="circlepack"?80:60','P==="circlepack"?160:60');
 await fs.writeFile(file,s);
}
console.log('Circle Packing updated in web and offline builds.');
