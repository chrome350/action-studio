import {createRequire}from'node:module';import fs from'node:fs/promises';import{pathToFileURL}from'node:url';
const require=createRequire(import.meta.url),deps='/Users/kogavrilova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';const{chromium}=require(deps+'playwright');const{PNG}=require(deps+'pngjs');
const cycle=Number(process.argv[2]||1),dir='practice-prompts/three-cycles';const b=await chromium.launch({channel:'chrome',headless:true});const report={cycle,errors:[],checks:[]};try{
const c=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const ref=await c.newPage(),p=await c.newPage();for(const page of[ref,p])page.on('pageerror',e=>report.errors.push(e.message));
await ref.goto(pathToFileURL(process.cwd()+'/workshop-action/index.html').href);await p.goto(pathToFileURL(process.cwd()+'/'+dir+'/cycle'+cycle+'-step3.html').href);await ref.waitForTimeout(1000);
console.log('buttons',await ref.getByRole('button').allTextContents());
for(const page of[ref,p]){await page.locator('input[type=file]').setInputFiles('flowers.png');await page.waitForTimeout(1800)}
const rc=ref.locator('.stage > canvas').first(),pc=p.locator('canvas').first();
const pix=async loc=>PNG.sync.read(Buffer.from(await loc.evaluate(c=>c.toDataURL().split(',')[1]),'base64'));
async function compare(name){const a=await pix(rc),z=await pix(pc);let changed=0,sum=0,max=0;for(let i=0;i<a.data.length;i+=4){let diff=false;for(let ch=0;ch<3;ch++){const d=Math.abs(a.data[i+ch]-z.data[i+ch]);sum+=d;max=Math.max(max,d);if(d)diff=true}if(diff)changed++}report[name]={differentPixels:changed,totalPixels:a.width*a.height,meanAbsoluteChannelError:sum/(a.width*a.height*3),maxChannelError:max};}
await compare('defaultFrame');await ref.screenshot({path:dir+'/reference-desktop.png',fullPage:true});await p.screenshot({path:dir+'/cycle'+cycle+'-desktop.png',fullPage:true});
console.log('grid candidates',await ref.locator('button').evaluateAll(es=>es.map(e=>({text:e.textContent,title:e.title,aria:e.getAttribute('aria-label')}))));
await fs.writeFile(dir+'/cycle'+cycle+'-frame.png',PNG.sync.write(await pix(pc)));
report.canvas=await pc.evaluate(e=>[e.width,e.height]);
const download=p.waitForEvent('download');await p.getByRole('button',{name:'Скачать PNG',exact:true}).click();await(await download).saveAs(dir+'/cycle'+cycle+'-export.png');const exp=PNG.sync.read(await fs.readFile(dir+'/cycle'+cycle+'-export.png'));report.export=[exp.width,exp.height];
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);await p.screenshot({path:dir+'/cycle'+cycle+'-mobile.png',fullPage:true});report.mobileOverflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
await fs.writeFile(dir+'/cycle'+cycle+'-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await b.close()}
