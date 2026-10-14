import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=(await fs.readFile(new URL('source/letters-color.js',root),'utf8')).replaceAll('export function','function');
const module=`/* grid-letters-color:start */${source}/* grid-letters-color:end */`;
function replace(s,a,b){if(!s.includes(a))throw Error('Missing Letters hook: '+a);return s.replace(a,b)}
const ui='P==="letters"&&U.jsxs("div",{className:"dot-palette-control",children:[U.jsx("label",{htmlFor:"letters-palette",children:"Цвет букв"}),U.jsx("select",{id:"letters-palette","aria-label":"Палитра букв",value:lettersPalette,onChange:e=>{setLettersPalette(e.target.value);L(0);_e.current=false;ye(false)},children:DotMatrixPalettes.map(p=>U.jsx("option",{value:p.id,children:p.name},p.id))}),U.jsx("div",{"aria-hidden":"true",style:{height:12,borderRadius:6,marginTop:10,background:"linear-gradient(90deg,"+lettersColors.join(",")+")"}})]}),';
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']) {
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 if(s.includes('/* grid-letters-color:start */'))s=s.replace(/\/\* grid-letters-color:start \*\/[\s\S]*?\/\* grid-letters-color:end \*\//,module);
 else {
  s=replace(s,'function MS(){',module+'function MS(){');
  s=replace(s,'[dotColors,setDotColors]=O.useState(DotMatrixPalettes[1].colors),','[dotColors,setDotColors]=O.useState(DotMatrixPalettes[1].colors),[lettersPalette,setLettersPalette]=O.useState("linked"),[lettersCustom,setLettersCustom]=O.useState("#34A4FA"),lettersColors=lettersPalette==="linked"?dotColors:lettersPalette==="custom"?[lettersCustom]:(DotMatrixPalettes.find(p=>p.id===lettersPalette)||DotMatrixPalettes[1]).colors,');
  s=replace(s,'function mb(i,o,f,r,s,h,v,S,T,_=0,b=0){','function mb(i,o,f,r,s,h,v,S,T,_=0,b=0,letterColor=null){');
  s=replace(s,'i.fillStyle=`rgb(${m.map((Q,Ut)=>Math.round(Q+(x[Ut]-Q)*J)).join(",")})`;const ct=Rh', 'i.fillStyle=letterColor?letterColor(K*V+V/2,P*B+B/2,J):`rgb(${m.map((Q,Ut)=>Math.round(Q+(x[Ut]-Q)*J)).join(",")})`;const ct=Rh');
  s=replace(s,'const ribbonImage=', 'const letterColor=Je&&(P==="letters"||Object.values(K).some(cell=>cell.mode==="letters"))?lettersColorField(Mt.getImageData(0,0,600,600).data,600,600,lettersColors):null;const ribbonImage=');
  s=replace(s,'mb(Oe,cl.data,Ie,Ne,ol.size,B,Z,W/100,j,Zt,il)','mb(Oe,cl.data,Ie,Ne,ol.size,B,Z,W/100,j,Zt,il,letterColor)');
  s=replace(s,'ribbonDirection,ribbonMask]);','ribbonDirection,ribbonMask,lettersPalette,lettersCustom]);');
  s=replace(s,'setDotPalette("confa"),','setLettersPalette("linked"),setLettersCustom("#34A4FA"),setDotPalette("confa"),');
 }
 // Insert before Dot Matrix so its own rebuild doesn't swallow Letters controls.
 const start=s.indexOf('P==="letters"&&U.jsxs("div",{className:"dot-palette-control"');
 if(start>=0){const end=s.indexOf('P==="dotmatrix"&&U.jsxs',start);if(end<0)throw Error('Missing Letters UI end');s=s.slice(0,start)+ui+s.slice(end)}
 else s=replace(s,'P==="dotmatrix"&&U.jsxs',ui+'P==="dotmatrix"&&U.jsxs');
 // Duplicate one stop only for a solid swatch, without repeating a gradient.
 s=s.replace('lettersColors.concat(lettersColors).join', '(lettersColors.length===1?[lettersColors[0],lettersColors[0]]:lettersColors).join');
 s=s.replace('[lettersPalette,setLettersPalette]=O.useState("linked"),[lettersCustom,setLettersCustom]=O.useState("#34A4FA"),lettersColors=lettersPalette==="linked"?dotColors:lettersPalette==="custom"?[lettersCustom]:','[lettersPalette,setLettersPalette]=O.useState("confa"),lettersColors=')
 .replace('lettersPalette,lettersCustom]','lettersPalette]')
 .replace('setLettersPalette("linked"),setLettersCustom("#34A4FA"),','setLettersPalette("confa"),');
 await fs.writeFile(file,s);
}
console.log('Letters colour palettes updated in web and offline builds.');
