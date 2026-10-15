let participant='', state=null, stateSignature='', selectedWork=null, uploadData='', apiReady=false, drafts={};
const starterWorks=Array.from({length:11},(_,i)=>({id:'starter-'+(i+1),title:'Стартовая работа '+(i+1),image:'assets/starters/frame-'+(i+1)+'.jpg',starter:true}));
starterWorks.forEach(w=>add(w.image,w.title));
const profile=new URLSearchParams(location.search).get('participant')||'default';
const participantKey='action-gallery-participant-'+profile;
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4500)}
async function api(path,body){if(window.galleryCloud)return galleryCloud.request(path,body);const res=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Participant':participant},body:body===undefined?undefined:JSON.stringify(body)});let data;try{data=await res.json()}catch{throw Error('Сервер галереи недоступен. Запустите локальную рабочую версию.')}if(!res.ok)throw Error(data.error||'Не удалось выполнить действие.');return data}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function renderMine(){const list=$('#my-list');list.replaceChildren();const statuses={pending:'На модерации',approved:'Опубликована',rejected:'Не одобрена'};for(const w of state.mine){const row=el('div',undefined,'submission-row');row.append(el('strong',w.title),el('span',statuses[w.status]));list.append(row)}if(!state.mine.length)list.append(el('p','Вы ещё не отправляли работы.'))}
function renderState(next){state=next;const phase=state.settings.phase;
$('#add-impression').hidden=phase!=='words';
$('.upload').hidden=phase!=='upload';$('#empty').textContent=state.settings.liked?'Пока нет работ с лайками':'Здесь скоро появятся работы. Загрузите свою.';
const shown=[...(phase==='upload'&&!state.settings.liked?starterWorks:[]),...state.works.filter(w=>!state.settings.liked||w.likes>0)];const words=state.words;
const signature=JSON.stringify([shown.map(w=>[w.id,w.title,w.image]),words]);
if(signature!==stateSignature){stateSignature=signature;transition=null;container.replaceChildren();items=[];shown.forEach(w=>add(w.image||'/api/image/'+w.id,w.title,w.starter?null:w));words.forEach(w=>{const b=el('div',w.text,'word-card ds-word-bubble');container.append(b);items.push({b,p:null})});stage.classList.toggle('grid',grid);$('#empty').hidden=items.length>0}
renderMine();if(selectedWork&&$('#detail').open)renderWork(selectedWork);}
let votePending=false;
function renderWork(work){
selectedWork=state.works.find(w=>w.id===work.id);
const box=$('#work-actions');
if(!selectedWork){box.replaceChildren();$('#detail').close();return}
work=selectedWork;
const phase=state.settings.phase,liked=state.votes.includes(work.id);
if(phase==='upload'){box.replaceChildren();return}
let control=box.querySelector('.like-control');
if(!control||control.dataset.work!==work.id){
box.replaceChildren();control=el('div',undefined,'like-control');control.dataset.work=work.id;
const button=el('button',undefined,'like-button');button.type='button';
button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
const count=el('span',undefined,'like-count');count.setAttribute('aria-live','polite');count.setAttribute('aria-atomic','true');
control.append(button,count);box.append(control);
}
const vote=control.querySelector('button'),count=control.querySelector('.like-count');
vote.setAttribute('aria-label',liked?'Убрать лайк':'Поставить лайк');vote.setAttribute('aria-pressed',String(liked));vote.disabled=phase!=='voting'||votePending;
const nextCount=String(work.likes);
if(count.dataset.value!==nextCount){
count.dataset.value=nextCount;
if(!count.textContent||matchMedia('(prefers-reduced-motion: reduce)').matches){count.textContent=nextCount}
else{
count.getAnimations().forEach(a=>a.cancel());
const fade=count.animate([{opacity:1},{opacity:0}],{duration:140,fill:'forwards',easing:'ease-out'});
fade.finished.then(()=>{
if(count.dataset.value!==nextCount)return;
count.textContent=nextCount;fade.cancel();
count.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-in'});
}).catch(()=>{});
}
}
vote.onclick=async()=>{
if(votePending)return;
votePending=true;vote.disabled=true;
try{
await api('vote',{id:work.id,liked:!liked});await refresh();
if(control.isConnected){control.classList.remove('like-pop');void control.offsetWidth;control.classList.add('like-pop')}
}catch(e){toast(e.message)}finally{votePending=false;if(selectedWork&&$('#detail').open)renderWork(selectedWork)}
};
}
window.openWork=work=>{selectedWork=null;$('#work-actions').replaceChildren();if(work)renderWork(work)};
async function refresh(){renderState(await api('state'))}
$('.upload').onclick=()=>{if(!apiReady){toast('Откройте рабочую галерею на порту 8767.');return}$('#submission').showModal()};$('.upload').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('.upload').click()}};
$('.upload').removeAttribute('for');document.querySelectorAll('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
let uploadVersion=0;
async function loadFile(f){const version=++uploadVersion;uploadData='';$('#upload-preview').hidden=true;$('#drop-zone').hidden=false;$('#submit-error').textContent='';if(!f)return;if(!['image/png','image/jpeg'].includes(f.type)||f.size>20_000_000){$('#submit-error').textContent='Выберите PNG или JPEG до 20 МБ.';return}const url=URL.createObjectURL(f);try{const img=new Image();img.src=url;await img.decode();if(version!==uploadVersion)return;const scale=Math.min(1,2000/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext('2d');ctx.fillStyle='#07080b';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);uploadData=c.toDataURL('image/jpeg',.9);$('#upload-filename').textContent=f.name;$('#upload-preview').hidden=false;$('#drop-zone').hidden=true}catch{if(version===uploadVersion)$('#submit-error').textContent='Не удалось открыть изображение.'}finally{URL.revokeObjectURL(url)}}
$('#files').onchange=e=>loadFile(e.target.files[0]);
$('#replace-file').onclick=()=>$('#files').click();
const dropZone=$('#drop-zone');
for(const type of ['dragenter','dragover'])dropZone.addEventListener(type,e=>{e.preventDefault();dropZone.classList.add('drag-over')});
for(const type of ['dragleave','drop'])dropZone.addEventListener(type,e=>{e.preventDefault();dropZone.classList.remove('drag-over')});
dropZone.addEventListener('drop',e=>{if(e.dataTransfer.files.length!==1){$('#submit-error').textContent='Перетащите одно изображение.';return}loadFile(e.dataTransfer.files[0])});
$('#submission').addEventListener('dragover',e=>e.preventDefault());$('#submission').addEventListener('drop',e=>e.preventDefault());
$('#submit-form').onsubmit=async e=>{e.preventDefault();const form=e.target,button=form.querySelector('button[type=submit]');if(!uploadData){$('#submit-error').textContent='Дождитесь загрузки изображения.';return}button.disabled=true;$('#submit-error').textContent='';try{await api('submit',{image:uploadData.split(',')[1]});form.reset();uploadData='';$('#upload-preview').hidden=true;$('#drop-zone').hidden=false;$('#submission').close();toast('Работа отправлена на модерацию');await refresh()}catch(err){$('#submit-error').textContent=err.message}finally{button.disabled=false}};
(async()=>{try{participant=localStorage.getItem(participantKey)||'';if(window.galleryCloud||!participant){participant=(await api('join',{})).token;localStorage.setItem(participantKey,participant)}await refresh();apiReady=true;setInterval(()=>{if(!document.hidden&&!$('#work-actions input:focus'))refresh().catch(()=>{})},2500)}catch(e){if(window.galleryCloud){$('#empty').hidden=items.length>0;$('#empty').textContent='Не удалось подключиться к галерее. Обновите страницу.';console.error(e)}}})();

$('#add-impression').onclick=()=>$('#impression-dialog').showModal();
$('#impression-form').onsubmit=async e=>{
 e.preventDefault();const form=e.target,button=form.querySelector('button');
 const entries=[...form.querySelectorAll('input[name="impression"]')].map(input=>({input,text:input.value.trim().replace(/\s+/g,' ')})).filter(entry=>entry.text);
 const error=$('#impression-error');error.textContent='';
 if(!entries.length){error.textContent='Заполните хотя бы одно поле.';return}
 const invalid=entries.find(entry=>entry.text.length>60);
 if(invalid){error.textContent='В каждом поле — до 60 символов.';invalid.input.focus();return}
 button.disabled=true;let sent=0;
 try{for(const entry of entries){await api('words',{text:entry.text});entry.input.value='';sent++}form.reset();$('#impression-dialog').close();toast('Ответ отправлен');await refresh()}
 catch(err){error.textContent=(sent?'Часть ответа уже отправлена. Повторите отправку оставшихся полей. ':'')+err.message}
 finally{button.disabled=false}
};
