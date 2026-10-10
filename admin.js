const cfg=window.SWERTENG_LINK_CONFIG||{};
const configured=cfg.SUPABASE_URL?.startsWith('https://')&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes('PASTE_');
const client=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUrl=s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}};
const BUCKET='player-logos';
let rows=[],editing=null,currentLogoUrl=null;
function message(id,text,isError=false){$(id).textContent=text;$(id).classList.toggle('error',isError)}
function showPreview(url){const img=$('logoPreview');if(url){img.src=url;img.classList.add('show')}else{img.removeAttribute('src');img.classList.remove('show')}}
function showSession(user){$('authPanel').classList.toggle('hidden',!!user);$('appPanel').classList.toggle('hidden',!user);if(user){$('signedInAs').textContent=user.email||'Admin';loadRows()}}
function resetForm(){$('linkForm').reset();$('editId').value='';$('isActive').checked=true;editing=null;currentLogoUrl=null;showPreview(null);$('linkLogo').value='';$('formHeading').textContent='Magdagdag ng player link';$('saveLink').textContent='+ Save Link';message('formMessage','')}
async function loadRows(){
 $('listStatus').textContent='Naglo-load…';
 const {data,error}=await client.from('player_links').select('*').order('created_at',{ascending:false}).limit(1000);
 if(error){$('listStatus').textContent='Hindi ma-load: '+error.message;return}
 rows=data||[];renderRows();
}
function renderRows(){
 const q=$('adminSearch').value.trim().toLowerCase();
 const list=rows.filter(x=>[x.name,x.category,x.url,x.description].some(v=>String(v||'').toLowerCase().includes(q)));
 $('listStatus').textContent=`${rows.length} links sa database`;
 $('adminLinks').innerHTML=list.length?list.map(x=>`<article class="adminitem"><div class="iteminfo"><div class="admin-item-head">${x.logo_url?`<img class="admin-logo" src="${esc(x.logo_url)}" alt="Logo">`:'<span class="linkicon">↗</span>'}<div><b>${esc(x.name)}</b><span class="category">${esc(x.category)} · ${x.is_active?'Public':'Hidden'}</span></div></div><span class="muted urltext">${esc(x.url)}</span></div><div class="itemactions"><button class="button ghost" data-edit="${x.id}">Edit</button><button class="button danger" data-delete="${x.id}">Delete</button></div></article>`).join(''):'<div class="empty">Walang matching links.</div>';
}
async function uploadLogo(file){
 if(!file)return currentLogoUrl;
 const allowed=['image/png','image/jpeg','image/webp','image/gif'];
 if(!allowed.includes(file.type))throw new Error('Pumili ng PNG, JPG, WEBP o GIF na larawan.');
 if(file.size>5*1024*1024)throw new Error('Hanggang 5 MB lang ang logo.');
 const ext=({ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'})[file.type];
 const path=`${crypto.randomUUID()}.${ext}`;
 const {error}=await client.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
 if(error)throw error;
 const {data}=client.storage.from(BUCKET).getPublicUrl(path);
 return data.publicUrl;
}
$('linkLogo').addEventListener('change',()=>{const f=$('linkLogo').files?.[0];if(f){showPreview(URL.createObjectURL(f));message('formMessage','Logo napili na. I-save ang link para ma-upload online.')}});
$('clearLogo').addEventListener('click',()=>{$('linkLogo').value='';currentLogoUrl=null;showPreview(null);message('formMessage','Napiling logo ay inalis. Kapag nag-save ng existing link, matatanggal ang logo nito.')});
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!client)return;message('authMessage','Sinusubukan mag-login…');const {data,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){message('authMessage',error.message,true);return}message('authMessage','');showSession(data.user)});
$('logout').addEventListener('click',async()=>{await client.auth.signOut();showSession(null);resetForm()});
$('linkForm').addEventListener('submit',async e=>{e.preventDefault();if(!client)return;const url=validUrl($('linkUrl').value.trim());if(!url){message('formMessage','Ilagay ang valid na http o https URL.',true);return}
 const item={name:$('linkName').value.trim(),category:$('linkCategory').value.trim(),url,description:$('linkDescription').value.trim()||null,is_active:$('isActive').checked};
 $('saveLink').disabled=true;
 try{
  message('formMessage',$('linkLogo').files?.length?'Ina-upload ang logo at sine-save ang link…':'Sine-save…');
  item.logo_url=await uploadLogo($('linkLogo').files?.[0]);
  const result=editing?await client.from('player_links').update(item).eq('id',editing).select().single():await client.from('player_links').insert(item).select().single();
  if(result.error)throw result.error;
  message('formMessage',editing?'Na-update ang link at logo.':'Naidagdag ang link at logo.');resetForm();await loadRows();
 }catch(err){message('formMessage','Hindi na-save: '+(err.message||'May error sa upload o database.'),true)}finally{$('saveLink').disabled=false}
});
$('adminLinks').addEventListener('click',async e=>{
 const eb=e.target.closest('[data-edit]'),db=e.target.closest('[data-delete]');
 if(eb){const x=rows.find(r=>String(r.id)===eb.dataset.edit);if(!x)return;editing=x.id;currentLogoUrl=x.logo_url||null;$('editId').value=x.id;$('linkName').value=x.name;$('linkCategory').value=x.category;$('linkUrl').value=x.url;$('linkDescription').value=x.description||'';$('isActive').checked=x.is_active;$('linkLogo').value='';showPreview(currentLogoUrl);$('formHeading').textContent='I-edit ang player link';$('saveLink').textContent='I-save ang update';window.scrollTo({top:0,behavior:'smooth'});}
 if(db){const x=rows.find(r=>String(r.id)===db.dataset.delete);if(!x||!confirm(`Burahin ang "${x.name}"?`))return;const {error}=await client.from('player_links').delete().eq('id',x.id);if(error){alert('Hindi nabura: '+error.message);return}await loadRows();}
});
$('cancelEdit').addEventListener('click',resetForm);$('adminSearch').addEventListener('input',renderRows);
if(!configured){$('setupWarning').classList.remove('hidden');$('setupWarning').textContent='Hindi pa configured ang Supabase. Sundin muna ang README.md at palitan ang config.js. Huwag kailanman ilagay ang service_role key sa website.';}
else{client.auth.getSession().then(({data})=>showSession(data.session?.user||null));client.auth.onAuthStateChange((_event,session)=>showSession(session?.user||null));}
