(() => {
 const config=window.GALLERY_CLOUD;
 if(!config?.publishableKey || (['localhost','127.0.0.1'].includes(location.hostname)&&!new URLSearchParams(location.search).has('cloud')))return;
 const admin=location.pathname.endsWith('admin.html');
 const client=supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:admin?'gallery-cloud-admin':'gallery-cloud-visitor'}});
 const images=new Map();let joining;
 function unwrap(result){if(result.error)throw Error(result.error.message);return result.data}
 async function ready(){const {session}=unwrap(await client.auth.getSession());if(session)return session;if(admin)throw Error('Войдите по почте');if(!joining)joining=client.auth.signInAnonymously().then(unwrap).finally(()=>joining=null);return (await joining).session}
 async function image(path){const old=images.get(path);if(old&&old.until>Date.now())return old.url;const data=unwrap(await client.storage.from('gallery').createSignedUrl(path,300));images.set(path,{url:data.signedUrl,until:Date.now()+240000});return data.signedUrl}
 async function request(action,body={}){await ready();if(action==='submit'){const bytes=Uint8Array.from(atob(body.image),c=>c.charCodeAt(0));const session=await ready();const path=session.user.id+'/'+crypto.randomUUID()+'.jpg';unwrap(await client.storage.from('gallery').upload(path,new Blob([bytes],{type:'image/jpeg'})));body={path}}
 const data=unwrap(await client.rpc('gallery_api',{action,payload:body}));if(data.works)await Promise.all(data.works.map(async w=>w.image=await image(w.path)));return data}
 window.galleryCloud={request,client,ready,image};
})();
