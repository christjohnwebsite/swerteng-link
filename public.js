const cfg=window.SWERTENG_LINK_CONFIG||{};
const configured=cfg.SUPABASE_URL?.startsWith('https://')&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes('PASTE_');
const client=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
let allLinks=[],category='All';

// Analytics: record public page visits and player-link clicks.
async function trackAnalyticsEvent(eventType, playerLinkId=null){
 if(!client) return;
 try {
  const row={event_type:eventType};
  if(playerLinkId!==null) row.player_link_id=String(playerLinkId);
  const {error}=await client.from('analytics_events').insert(row);
  if(error) console.warn('Analytics tracking failed:',error.message);
 } catch(error) { console.warn('Analytics tracking failed:',error); }
}

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUrl=s=>{try{let u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}};
function render(){
 const q=$('search').value.trim().toLowerCase();
 const categories=['All',...new Set(allLinks.map(x=>x.category).filter(Boolean).sort((a,b)=>a.localeCompare(b)))];
 if(!categories.includes(category))category='All';
 $('filters').innerHTML=categories.map(c=>`<button class="chip ${c===category?'active':''}" data-category="${esc(c)}">${c==='All'?'Lahat':esc(c)}</button>`).join('');
 const filtered=allLinks.filter(x=>(category==='All'||x.category===category)&&[x.name,x.category,x.description].some(v=>String(v||'').toLowerCase().includes(q)));
 $('count').textContent=allLinks.length;$('cats').textContent=Math.max(0,categories.length-1);
 $('links').innerHTML=filtered.length?filtered.map(x=>{const u=validUrl(x.url);return `<article class="card" data-link-id="${esc(x.id)}"><div class="cardtitle"><span class="linkicon">↗</span><div><h3>${esc(x.name)}</h3><span class="category">${esc(x.category)}</span></div></div><p class="muted description">${esc(x.description||'Player link')}</p>${u?`<a class="button primary open" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Buksan ang link ↗</a>`:''}</article>`}).join(''):'<div class="empty">Walang nahanap na links.</div>';
}
$('search').addEventListener('input',render);
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;render()}});
async function load(){
 if(!configured){$('links').innerHTML='<div class="empty">Hindi pa nakakabit ang database. I-setup ang Supabase at config.js ayon sa README.</div>';return}
 try{const {data,error}=await client.from('player_links').select('id,name,category,url,description').eq('is_active',true).order('created_at',{ascending:false}).limit(1000);if(error)throw error;allLinks=data||[];render();$('notice').textContent='';}
 catch(e){$('links').innerHTML='<div class="empty">Hindi ma-load ang links. Tingnan ang Supabase setup at database policies.</div>';$('notice').textContent=e.message||'Database error';}
}
$('filters').addEventListener('click',()=>{});

// Count clicks on player-link buttons using delegated event handling.
$('links').addEventListener('click',e=>{
 const link=e.target.closest('a.open');
 if(!link) return;
 const card=link.closest('[data-link-id]');
 if(card) trackAnalyticsEvent('click',card.dataset.linkId);
});

// Count each public homepage load as a visit.
trackAnalyticsEvent('visit');
load();