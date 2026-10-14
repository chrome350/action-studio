import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 s=s.replace('U.jsx("div",{className:"brand",children:U.jsx("span",{children:"Grid Studio"})}),U.jsx("span",{className:"document-title",children:mediaName+" · 600 × 600 px"})','U.jsx("div",{className:"brand",children:U.jsx("img",{ref:Ke,className:"brand-logo",src:pb,alt:"AVITO ACTION",draggable:!1,style:{height:40,width:"auto",display:"block",opacity:1}})})');
 s=s.replace(/,U\.jsx\("img",\{ref:Ke,className:"stage-logo",src:pb,alt:"AVITO ACTION",draggable:!1,style:\{(?:opacity:\.5,)?top:`\$\{Qc\/600\*100\}%`,left:`\$\{Qc\/600\*100\}%`,height:`\$\{\$h\/600\*100\}%`\}\}\)/,'');
 s=s.replace('const oe=bt.width/600,Me=$h*oe;Rt.save();Rt.globalAlpha=.5;Rt.drawImage(at,Qc*oe,Qc*oe,Me*at.naturalWidth/at.naturalHeight,Me);Rt.restore();','');
 if(!s.includes('className:"brand-logo"'))throw Error('Missing header branding');
 await fs.writeFile(file,s);
}
console.log('Opaque Avito Action logo moved to header; canvas and exports are unbranded.');

// Match the logo's top inset to the header's left inset.
for(const name of ['assets/index-DlFOVRFE.css','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 s=s.replace('header{height:56px;padding:0 calc(var(--sidebar-width) + var(--sidebar-inset) + 24px) 0 16px;', 'header{height:72px;padding:16px calc(var(--sidebar-width) + var(--sidebar-inset) + 24px) 16px 16px;');
 s=s.replace('header{height:auto;min-height:76px;', 'header{height:auto;min-height:72px;');
 await fs.writeFile(file,s);
}
