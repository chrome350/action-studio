import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const file=new URL(name,root);let s=await fs.readFile(file,'utf8');
 const a=s.indexOf('function ul(){'),b=s.indexOf('O.useEffect(',a);
 if(a<0||b<0)throw Error('Missing random cycle hook');
 let body=s.slice(a,b);
 if(!body.includes('videoTools.toggle()')){
  body=body.replace('ht(!0),vt(!0),_e.current=!1,ye(!1)', 'ht(!0),vt(!0);if(Ft.current?.tagName==="VIDEO"&&Ft.current.paused){videoTools.toggle()}else{_e.current=false;ye(false)}');
 }
 s=s.slice(0,a)+body+s.slice(b);await fs.writeFile(file,s);
}
console.log('Random cycle resumes paused video through shared playback control.');
