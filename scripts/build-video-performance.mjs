import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const esbuild=createRequire(import.meta.url)(process.env.GRID_ESBUILD_PATH||'esbuild');
const root=new URL('../',import.meta.url);
const source=(await fs.readFile(new URL('source/video-performance.js',root),'utf8')).replaceAll('export function','function');
const module=`/* grid-video-performance:start */${source}/* grid-video-performance:end */`;
const renderer=(await esbuild.transform(await fs.readFile(new URL('source/video-render-loop.js',root),'utf8'),{minifyWhitespace:true,target:'es2022'})).code.trim();
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 if(s.includes('/* grid-video-performance:start */'))s=s.replace(/\/\* grid-video-performance:start \*\/[\s\S]*?\/\* grid-video-performance:end \*\//,module);
 else s=s.replace('function MS(){',module+'function MS(){');
 const a=s.indexOf('/* grid-video-render:start */'),start=a>=0?a:s.indexOf('O.useLayoutEffect(()=>{lettersMotion');
 const end=s.indexOf('function captureEffectFade',start);if(start<0||end<0)throw Error('Missing video render hooks');
 s=s.slice(0,start)+'/* grid-video-render:start */'+renderer+'/* grid-video-render:end */'+s.slice(end);
 s=s.replace('ctx.drawImage(Be.current,0,0);','ctx.drawImage(Be.current,0,0,600,600);');
 s=s.replace('async function va(){const at=Ke.current;', 'async function va(){if(Ft.current?.tagName==="VIDEO"){if(!(await videoTools.ensureFullFrame()))return;}const at=Ke.current;');
 // Space uses refs so its initial event listener also sees later source changes.
 s=s.replace('if(_e.current)media.pause();else media.play().catch(()=>{})','if(_e.current){media.pause();media.gridFullFrame=true;media.gridNeedsFullFrame=true}else{media.gridFullFrame=false;media.play().catch(()=>{})}');
 await fs.writeFile(file,s);
}
console.log('Adaptive 300px video preview and full-quality pause/export renderer updated.');
