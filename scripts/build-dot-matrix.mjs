import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const source = (await fs.readFile(new URL('source/dot-matrix.js', root), 'utf8')).replace('export function', 'function');
const module = `/* grid-dot-matrix:start */${source}/* grid-dot-matrix:end */`;
function replace(text, from, to) {
  if (!text.includes(from)) throw new Error(`Missing dot-matrix hook: ${from}`);
  return text.replace(from, to);
}
const paletteUI = 'P==="dotmatrix"&&U.jsxs("div",{className:"dot-palette-control",children:[U.jsx("select",{id:"dot-palette","aria-label":"Градиент точек",value:dotPalette,onChange:event=>{const preset=DotMatrixPalettes.find(p=>p.id===event.target.value);if(preset){setDotPalette(preset.id);setDotColors(preset.colors);L(0)}},children:DotMatrixPalettes.map(p=>U.jsx("option",{value:p.id,children:p.name},p.id))}),U.jsx("div",{"aria-hidden":"true",style:{height:12,borderRadius:6,marginTop:10,background:"linear-gradient(90deg,"+dotColors.join(",")+")"}})]}),';
for (const name of ['assets/index-BwYdjEfo.js', 'Grid Studio.html']) {
  const file = new URL(name, root);
  let text = await fs.readFile(file, 'utf8');
  if (text.includes('/* grid-dot-matrix:start */')) {
    text = text.replace(/\/\* grid-dot-matrix:start \*\/[\s\S]*?\/\* grid-dot-matrix:end \*\//, module);
  } else {
    text = replace(text, 'Ih={clean:24,', 'Ih={dotmatrix:14,clean:24,');
    text = replace(text, 'ci=[', 'ci=[{mode:"dotmatrix",label:"Dot Matrix",description:"Белые точки на чёрном фоне. Яркость управляет диаметром, мелкие детали растворяются.",sizeLabel:"Шаг точек"},');
    text = replace(text, 'function MS(){', module + 'function MS(){');
    text = replace(text, 'const ke=document.createElement("canvas"),', 'const dotMatrixImage=Je&&(P==="dotmatrix"||Object.values(K).some(cell=>cell.mode==="dotmatrix"))?renderDotMatrix(Mt.getImageData(0,0,600,600).data,600,600,J.dotmatrix,W/100):null;const ke=document.createElement("canvas"),');
    text = replace(text, 'cl=Mt.getImageData(Zt,il,Ie,Ne);if(', 'cl=Mt.getImageData(Zt,il,Ie,Ne);if((K[kt*f+ne]?.mode||P)==="dotmatrix"){if(dotMatrixImage){Mt.drawImage(dotMatrixImage,Zt,il,Ie,Ne,Zt,il,Ie,Ne);ib(cl.data,W/100,j)&&gi.push(kt*f+ne)}else{Mt.fillStyle="#000";Mt.fillRect(Zt,il,Ie,Ne)}continue}if(');
    text = replace(text, 'Ge(qn.sizeLabel,Sl.size,2,60,', 'Ge(qn.sizeLabel,Sl.size,P==="dotmatrix"?6:2,60,');
  }
  text = text.replace('Ih={dotmatrix:14,', 'Ih={dotmatrix:8,');
  text = text.replace(/Ih=\{dotmatrix:(?:8|14),/, 'Ih={dotmatrix:6,').replace('Sl.size,P==="dotmatrix"?6:2,60,','Sl.size,P==="dotmatrix"?4:2,60,');
  if (!text.includes('[dotPalette,setDotPalette]')) {
    text = replace(text, '[actionClarity,setActionClarity]=O.useState(16),', '[actionClarity,setActionClarity]=O.useState(16),[dotPalette,setDotPalette]=O.useState("spectrum"),[dotColors,setDotColors]=O.useState(DotMatrixPalettes[0].colors),');
    text = replace(text, '600,600,J.dotmatrix,W/100):null', '600,600,J.dotmatrix,W/100,null,dotColors):null');
    text = replace(text, 'Q,Lt,actionClarity]);', 'Q,Lt,actionClarity,dotColors]);');
    text = replace(text, 'setActionClarity(16),y.current=0', 'setActionClarity(16),setDotPalette("spectrum"),setDotColors(DotMatrixPalettes[0].colors),y.current=0');

  }
  const paletteStart = text.indexOf('P==="dotmatrix"&&U.jsxs("div",{className:"dot-palette-control"');
  if (paletteStart >= 0) {
    const paletteEnd = text.indexOf('qn.sizeLabel&&Ge(', paletteStart);
    if (paletteEnd < 0) throw new Error('Missing palette end hook');
    text = text.slice(0,paletteStart) + paletteUI + text.slice(paletteEnd);
  } else text = replace(text, 'qn.sizeLabel&&Ge(', paletteUI + 'qn.sizeLabel&&Ge(');
  text=text.replace('[dotPalette,setDotPalette]=O.useState("spectrum")','[dotPalette,setDotPalette]=O.useState("confa")').replace('[dotColors,setDotColors]=O.useState(DotMatrixPalettes[0].colors)','[dotColors,setDotColors]=O.useState(DotMatrixPalettes[1].colors)').replace('setDotPalette("spectrum"),setDotColors(DotMatrixPalettes[0].colors)','setDotPalette("confa"),setDotColors(DotMatrixPalettes[1].colors)');
  await fs.writeFile(file, text);
}
console.log('Dot Matrix updated in web and offline builds.');
