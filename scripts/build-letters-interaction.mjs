import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=(await fs.readFile(new URL('source/letters-interaction.js',root),'utf8')).replaceAll('export function','function');
const module=`/* grid-letters-interaction:start */${source}/* grid-letters-interaction:end */`;
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 let s=await fs.readFile(new URL(name,root),'utf8');
 function patch(a,b){if(!s.includes(a))throw Error('Missing interaction hook: '+a);s=s.replace(a,b)}
 if(s.includes('/* grid-letters-interaction:start */'))s=s.replace(/\/\* grid-letters-interaction:start \*\/[\s\S]*?\/\* grid-letters-interaction:end \*\//,module);
 else{
 patch('function MS(){',module+'function MS(){');
 patch('[lettersPalette,setLettersPalette]', '[lettersInteractive,setLettersInteractive]=O.useState(true),[lettersRadius,setLettersRadius]=O.useState(100),[lettersStrength,setLettersStrength]=O.useState(45),lettersMotion=O.useRef(createLettersInteraction()),[lettersPalette,setLettersPalette]');
 patch('let at=0,bt=null,Rt=!1,oe=null,Me=null,dotPrepared=null;', 'lettersMotion.current.cells=[];lettersMotion.current.last=0;let at=0,bt=null,Rt=!1,oe=null,Me=null,dotPrepared=null;');
 patch('Mt.fillStyle=T,Mt.globalAlpha=v?b/100:0', 'drawLettersInteraction(Mt,lettersMotion.current,lettersInteractive,lettersRadius,lettersStrength,su,performance.now());Mt.fillStyle=T,Mt.globalAlpha=v?b/100:0');
 patch('oe&&!su&&El-fu>=1e3/30', '(oe&&!su||lettersMotion.current.cells.length>0)&&El-fu>=1e3/30');
 patch('bt=Je,Rt=!0,Mt.fillStyle', 'lettersMotion.current.cells=[];bt=Je,Rt=!0,Mt.fillStyle');
 patch('Mt.drawImage(ke,Zt,il)):Mt.putImageData', 'ol.mode==="letters"&&cacheLettersCell(lettersMotion.current,ke,Zt,il,ol.size,B),Mt.drawImage(ke,Zt,il)):Mt.putImageData');
 patch('ribbonMask,lettersPalette]);', 'ribbonMask,lettersPalette,lettersInteractive,lettersRadius,lettersStrength]);');
 patch('setLettersPalette("confa"),','setLettersInteractive(true),setLettersRadius(100),setLettersStrength(45),lettersMotion.current.pointer=null,setLettersPalette("confa"),');
 patch('className:"stage",children:', `className:"stage",style:{touchAction:lettersInteractive&&(P==="letters"||Object.values(K).some(c=>c.mode==="letters"))?"none":undefined},onPointerMove:e=>{const rect=e.currentTarget.getBoundingClientRect();lettersMotion.current.pointer={x:(e.clientX-rect.left)*600/rect.width,y:(e.clientY-rect.top)*600/rect.height,down:e.buttons>0}},onPointerDown:e=>{if(e.button!==0)return;const rect=e.currentTarget.getBoundingClientRect();lettersMotion.current.pointer={x:(e.clientX-rect.left)*600/rect.width,y:(e.clientY-rect.top)*600/rect.height,down:true}},onPointerUp:e=>{if(e.pointerType!=="mouse")lettersMotion.current.pointer=null;else if(lettersMotion.current.pointer)lettersMotion.current.pointer.down=false},onPointerLeave:()=>{lettersMotion.current.pointer=null},onPointerCancel:()=>{lettersMotion.current.pointer=null},children:`);

 }
 if(!s.includes('Взаимодействие с буквами')){
 patch('P==="letters"&&U.jsxs("div",{className:"dot-palette-control",children:[', 'P==="letters"&&U.jsxs("div",{className:"dot-palette-control",children:[U.jsxs("label",{style:{display:"flex",gap:8,alignItems:"center",marginBottom:12},children:[U.jsx("input",{type:"checkbox",checked:lettersInteractive,onChange:e=>setLettersInteractive(e.target.checked)}),"Взаимодействие с буквами"]}),lettersInteractive&&Ge("Радиус",lettersRadius,30,200,setLettersRadius," px"),lettersInteractive&&Ge("Сила",lettersStrength,0,100,setLettersStrength,"%"),');
 }
 s=s.replace('lettersStrength,su,performance.now());','lettersStrength,su,performance.now(),v);');
 await fs.writeFile(new URL(name,root),s);
}
console.log('Letters interaction updated in web and offline builds.');
