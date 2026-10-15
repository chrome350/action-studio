import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 const mount='ub.createRoot(document.getElementById("root")).render(U.jsx(Wh.StrictMode,{children:U.jsx(MS,{})}));';
 const next='if(document.getElementById("root"))'+mount;
 if(!s.includes(next)){if(!s.includes(mount))throw new Error('Missing mount');s=s.replace(mount,next);}
 s=s.replace(/\/\* grid-catalog-api:start \*\/[\s\S]*?\/\* grid-catalog-api:end \*\//g,'');
 const api='/* grid-catalog-api:start */window.GridStudioComponents={React:O,jsx:U,createRoot:ub.createRoot,Slider:cg,ParameterValue:GridParameterValue,DimensionInput:GridDimensionInput,LineControl:GridLineControl,GradientPicker,Button:ri};/* grid-catalog-api:end */';
 if(name.endsWith('.js'))s+=api;else s=s.replace('</script>',api+'</script>');
 await fs.writeFile(file,s);
}
