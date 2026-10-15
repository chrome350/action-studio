import assert from 'node:assert/strict';
import {createRequire}from'node:module';
import fs from'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.GRID_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={errors:[],effects:[]};
try{
const p=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://127.0.0.1:56894/');await p.locator('input[type=file]').setInputFiles('flowers.png');
const wait=()=>p.waitForFunction(()=>{let c=document.querySelector('.stage>canvas');return c?.width===1080&&c.height===1080&&c.dataset.gridRenderPending==='false'&&c.dataset.gridFrameReady==='true'},{},{timeout:60000});await wait();
await p.getByRole('checkbox',{name:'Анимация свечения',exact:true}).uncheck();await wait();
for(const mode of['clean','letters','dotmatrix','ribbons','clean']){
await p.getByRole('combobox',{name:'Режим эффекта'}).selectOption(mode);await wait();
const data=await p.locator('.stage>canvas').first().evaluate(c=>({size:[c.width,c.height],worker:c.dataset.gridWorker,nonempty:c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((x,i)=>i%4!==3&&x>30)}));assert.deepEqual(data.size,[1080,1080]);assert.ok(data.nonempty);report.effects.push({mode,...data});
}
assert.deepEqual(await p.locator('.transition-canvas').evaluate(c=>[c.width,c.height]),[1080,1080]);
await p.waitForTimeout(900);const before=await p.locator('.stage>canvas').first().evaluate(c=>c.toDataURL());const download=p.waitForEvent('download');await p.getByRole('button',{name:'Скачать PNG',exact:true}).click();const file=await download;await file.saveAs('/tmp/grid-native-1080.png');const png=await fs.readFile('/tmp/grid-native-1080.png');assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1080);report.export={size:[1080,1080],sameAsCanvas:before==='data:image/png;base64,'+png.toString('base64')};
await p.locator('input[type=file]').setInputFiles('/tmp/grid-video-with-audio.mp4');await wait();report.videoPlaying=await p.locator('.stage>canvas').first().evaluate(c=>[c.width,c.height]);await p.locator('.stage').click({position:{x:300,y:300}});await p.keyboard.press('Space');await wait();report.videoPaused=await p.locator('.stage>canvas').first().evaluate(c=>[c.width,c.height]);
assert.deepEqual(report.errors,[]);await fs.writeFile('practice-prompts/independent-check-2/native1080/smoke.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close()}
