import {workshopStages as workshopPhases,workshopStageIndex} from './workshop-stages.js';
const $=s=>document.querySelector(s);let key=sessionStorage.getItem('gallery-admin')||'',settings=null,works=[],signature='',wordSignature='',urls=[],phaseChanging=false;
async function request(path,body){if(window.galleryCloud)return galleryCloud.request(path,body);const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error);return data}
function el(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e}
async function refresh(){const [data,state]=await Promise.all([request('admin'),request('state')]);works=data.works;settings=state.settings;$('#words-panel').hidden=!['words','results'].includes(settings.phase);renderWords(data.words);renderPhases();$('#login').hidden=true;$('#dashboard').hidden=false;$('#admin-error').textContent='';$('#liked').checked=!!settings.liked;$('#show-words').checked=!!settings.words;$('#session-info').textContent=`Участников: ${data.participants} · На модерации: ${works.filter(w=>w.status==='pending').length} · Опубликовано: ${works.filter(w=>w.status==='approved').length}`;const sig=JSON.stringify([works,$('#filter').value]);if(sig!==signature){signature=sig;await render()}}
async function render(){urls.forEach(URL.revokeObjectURL);urls=[];const box=$('#moderation');box.replaceChildren();const shown=works.filter(w=>$('#filter').value==='all'||w.status===$('#filter').value);if(!shown.length)box.append(el('p','Здесь пока нет работ.'));for(const w of shown){const card=el('article');card.className='moderation-card';const img=el('img');img.alt=w.title;card.append(img,el('h3',w.title),el('p',`${w.author} · Лайки: ${w.likes}`));for(const [status,label] of [['approved','Одобрить'],['rejected','Не показывать'],['pending','На модерацию']]){if(status===w.status)continue;const button=el('button',label);if(status==='approved')button.className='approve';button.onclick=async()=>{button.disabled=true;try{await request('admin/moderate',{id:w.id,status});await refresh()}catch(e){$('#admin-error').textContent=e.message;button.disabled=false}};card.append(button)}box.append(card);if(w.image){img.src=w.image;continue}const r=await fetch('/api/image/'+w.id,{headers:{Authorization:'Bearer '+key}});if(r.ok){const url=URL.createObjectURL(await r.blob());urls.push(url);img.src=url}}}
async function update(change){try{await request('admin/settings',{...settings,...change});await refresh()}catch(e){$('#admin-error').textContent=e.message}}
$('#login').onsubmit=async e=>{e.preventDefault();key=$('#key').value.trim();try{await refresh();sessionStorage.setItem('gallery-admin',key);$('#key').value=''}catch(err){$('#admin-error').textContent=err.message}};
function buildPhases(){
 const list=$('#phases');list.replaceChildren();
 workshopPhases.forEach((step,index)=>{
  const row=el('li'),number=el('span',index+1),content=el('span'),title=el('span',step.label),time=el('span',step.time),status=el('span');
  row.dataset.phase=step.id;number.className='phase-number';number.setAttribute('aria-hidden','true');
  content.className='phase-content';title.className='phase-label';time.className='phase-time';status.className='phase-status';
  content.append(title);if(step.time)content.append(time);row.append(number,content,status);list.append(row);
 });
}
buildPhases();
function renderPhases(){
 const current=workshopStageIndex(settings);
 $('#current-step').textContent=current>=0?`Этап ${current+1} из ${workshopPhases.length}`:'Не удалось определить текущий этап';
 $('#step-hint').textContent=workshopPhases[current]?.hint||'';
 document.querySelectorAll('#phases [data-phase]').forEach((row,index)=>{
  row.classList.toggle('active',index===current);
  row.classList.toggle('complete',current>=0&&index<current);
  if(index===current)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');
  row.querySelector('.phase-status').textContent=index===current?'Сейчас':current>=0&&index<current?'Пройден':'Далее';
 });
 const next=current>=0?workshopPhases[current+1]:null;
 const button=$('#next-step');
 button.textContent=phaseChanging?'Переключаем этап…':next?`Далее: ${next.label}`:current>=0?'Последний этап':'Следующий этап недоступен';
 button.disabled=phaseChanging||!next;
 $('#previous-step').disabled=phaseChanging||current<=0;
}
async function movePhase(direction){
 if(phaseChanging||!settings)return;
 const current=workshopStageIndex(settings),next=current>=0?workshopPhases[current+direction]:null;
 if(!next)return;
 phaseChanging=true;renderPhases();
 try{await update({phase:next.phase,liked:['words','results'].includes(next.phase),words:['words','results'].includes(next.phase)})}
 finally{phaseChanging=false;renderPhases()}
}
$('#next-step').onclick=()=>movePhase(1);
$('#previous-step').onclick=()=>movePhase(-1);
$('#liked').onchange=e=>update({liked:e.target.checked});$('#show-words').onchange=e=>update({words:e.target.checked});$('#filter').onchange=()=>{signature='';refresh().catch(e=>$('#admin-error').textContent=e.message)};$('#logout').onclick=()=>{sessionStorage.removeItem('gallery-admin');key='';$('#dashboard').hidden=true;$('#login').hidden=false};
if(location.hash.startsWith('#key=')){key=decodeURIComponent(location.hash.slice(5));history.replaceState(null,'',location.pathname);sessionStorage.setItem('gallery-admin',key)}
if(key&&!window.galleryCloud)refresh().catch(e=>$('#admin-error').textContent=e.message);setInterval(()=>{if(key&&!document.hidden)refresh().catch(e=>$('#admin-error').textContent=e.message)},3000);
function renderWords(words){const sig=JSON.stringify([words,$('#word-filter').value]);$('#word-count').textContent='· '+words.filter(w=>w.status==='pending').length;if(sig===wordSignature)return;wordSignature=sig;const box=$('#word-moderation');box.replaceChildren();const shown=words.filter(w=>$('#word-filter').value==='all'||w.status===$('#word-filter').value);if(!shown.length)box.append(el('p','Здесь пока нет ответов.'));for(const w of shown){const row=el('article');row.className='word-review';row.append(el('strong',w.text),el('p',({pending:'На модерации',approved:'На экране',rejected:'Не одобрено'}[w.status])));for(const [status,label] of [['approved','Одобрить'],['rejected','Не показывать']]){if(status===w.status)continue;const b=el('button',label);b.onclick=async()=>{b.disabled=true;try{await request('admin/moderate-word',{id:w.id,status});await refresh()}catch(e){$('#admin-error').textContent=e.message;b.disabled=false}};row.append(b)}box.append(row)}}

$('#word-filter').onchange=()=>{wordSignature='';refresh().catch(e=>$('#admin-error').textContent=e.message)};

if(window.galleryCloud){
 key='';
 const form=$('#login');form.replaceChildren();
 const emailLabel=el('label','Почта администратора'),email=el('input');email.type='email';email.autocomplete='email';email.required=true;emailLabel.append(email);
 const send=el('button','Получить ссылку для входа'),hint=el('p','');form.append(emailLabel,send,hint);
 form.onsubmit=async e=>{e.preventDefault();send.disabled=true;$('#admin-error').textContent='';try{const {error}=await galleryCloud.client.auth.signInWithOtp({email:email.value.trim(),options:{emailRedirectTo:'https://chrome350.github.io/grid-studio/gallery-prototype/admin.html'}});if(error)throw error;hint.textContent='Письмо отправлено. Нажмите ссылку в письме, чтобы открыть админку.'}catch(err){$('#admin-error').textContent=err.message}finally{send.disabled=false}};
 $('#logout').onclick=async()=>{await galleryCloud.client.auth.signOut();key='';$('#dashboard').hidden=true;form.hidden=false;hint.textContent=''};
 galleryCloud.client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)setTimeout(()=>refresh().then(()=>key='cloud').catch(e=>$('#admin-error').textContent=e.message),0)});
 galleryCloud.client.auth.getSession().then(async({data})=>{if(data.session){try{await refresh();key='cloud'}catch(e){$('#admin-error').textContent=e.message}}});
}
