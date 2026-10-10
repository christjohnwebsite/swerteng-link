const cfg = window.SWERTENG_LINK_CONFIG || {};
const configured = cfg.SUPABASE_URL?.startsWith('https://') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('PASTE_');
const client = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
let allLinks = [], category = 'All';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUrl = s => { try { const u = new URL(s); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } };

/* Compact layout for logos and link titles; injected here so no separate CSS edit is needed. */
(function addLogoStyles(){
  if (document.getElementById('swerteng-logo-styles')) return;
  const style = document.createElement('style');
  style.id = 'swerteng-logo-styles';
  style.textContent = `
    #links .cardtitle { display:flex; align-items:center; gap:12px; min-width:0; }
    #links .logo-circle, #links .cardtitle .linkicon { width:50px!important; height:50px!important; min-width:50px!important; max-width:50px!important; min-height:50px!important; max-height:50px!important; flex:0 0 50px!important; border-radius:50%!important; object-fit:cover!important; overflow:hidden; box-sizing:border-box; }
    #links .cardtitle .linkicon { display:flex; align-items:center; justify-content:center; }
    #links .cardtitle-text { min-width:0; flex:1; overflow-wrap:anywhere; }
    #links .cardtitle-text h3 { margin:0 0 4px; overflow-wrap:anywhere; word-break:break-word; }
    #links .card { min-width:0; }
    #links .cardtitle img { display:block; }
  `;
  document.head.appendChild(style);
})();

function render() {
  const q = $('search').value.trim().toLowerCase();
  const categories = ['All', ...new Set(allLinks.map(x => x.category).filter(Boolean).sort((a,b) => a.localeCompare(b)))];
  if (!categories.includes(category)) category = 'All';
  $('filters').innerHTML = categories.map(c => `<button class="chip ${c === category ? 'active' : ''}" data-category="${esc(c)}">${c === 'All' ? 'Lahat' : esc(c)}</button>`).join('');
  const filtered = allLinks.filter(x => (category === 'All' || x.category === category) && [x.name,x.category,x.description].some(v => String(v || '').toLowerCase().includes(q)));
  $('count').textContent = allLinks.length;
  $('cats').textContent = Math.max(0, categories.length - 1);
  $('links').innerHTML = filtered.length ? filtered.map(x => {
    const u = validUrl(x.url), logo = validUrl(x.logo_url);
    const icon = logo ? `<img class="logo-circle" src="${esc(logo)}" alt="Logo ng ${esc(x.name)}" loading="lazy" referrerpolicy="no-referrer">` : '<span class="linkicon" aria-hidden="true">↗</span>';
    return `<article class="card"><div class="cardtitle">${icon}<div class="cardtitle-text"><h3>${esc(x.name)}</h3><span class="category">${esc(x.category)}</span></div></div><p class="muted description">${esc(x.description || 'Player link')}</p>${u ? `<a class="button primary open" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Buksan ang link ↗</a>` : ''}</article>`;
  }).join('') : '<div class="empty">Walang nahanap na links.</div>';
  $('links').querySelectorAll('img.logo-circle').forEach(img => img.addEventListener('error', () => { const fallback = document.createElement('span'); fallback.className = 'linkicon'; fallback.textContent = '↗'; fallback.setAttribute('aria-hidden','true'); img.replaceWith(fallback); }, {once:true}));
}

$('search').addEventListener('input', render);
$('filters').addEventListener('click', e => { const b = e.target.closest('[data-category]'); if (b) { category = b.dataset.category; render(); } });
async function load() {
  if (!configured) { $('links').innerHTML = '<div class="empty">Hindi pa nakakabit ang database. I-setup ang Supabase at config.js ayon sa README.</div>'; return; }
  try {
    const { data, error } = await client.from('player_links').select('id,name,category,url,description,logo_url').eq('is_active', true).order('created_at', {ascending:false}).limit(1000);
    if (error) throw error;
    allLinks = data || []; render(); $('notice').textContent = '';
  } catch (e) {
    $('links').innerHTML = '<div class="empty">Hindi ma-load ang links. Tingnan ang Supabase setup at database policies.</div>';
    $('notice').textContent = e.message || 'Database error';
  }
}
load();
