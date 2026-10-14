import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
for(const name of ['assets/index-BwYdjEfo.js','Grid Studio.html']){
 const source=await fs.readFile(new URL('../'+name,import.meta.url),'utf8');
 const a=source.indexOf('function ul(){'),b=source.indexOf('O.useEffect(',a);
 for(const paused of [true,false]){
  let toggles=0,map=null,enabled=false,running=false;
  const media={tagName:'VIDEO',paused,gridFullFrame:paused},freeze={current:paused};
  const sandbox={Math,et:false,Xt:{current:[0,1,6,7]},Et:{current:0},Bt:()=> 'letters',captureEffectFade(){},w:value=>map=value,ht:value=>enabled=value,vt:value=>running=value,_e:freeze,ye(){},Ft:{current:media},videoTools:{toggle(){toggles++;media.paused=false;media.gridFullFrame=false;freeze.current=false}}};
  vm.createContext(sandbox);vm.runInContext(source.slice(a,b),sandbox);sandbox.ul();
  assert.equal(media.paused,false);assert.equal(freeze.current,false);assert.equal(media.gridFullFrame,false);
  assert.equal(toggles,paused?1:0);assert.ok(enabled&&running);assert.equal(Object.keys(map).length,4);
 }
}
console.log('Cycle regression: paused/seeked video resumes; playing video is not toggled; mixed cells and cycle stay active in both builds.');
