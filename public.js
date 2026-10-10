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

/* Facebook at Telegram links: remote values are read from Supabase site_settings. */
(function addSocialStyles(){
  if (document.getElementById('swerteng-social-styles')) return;
  const style = document.createElement('style');
  style.id = 'swerteng-social-styles';
  style.textContent = `
    .social-links { display:flex; gap:12px; flex-wrap:wrap; max-width:1200px; margin:14px auto 22px; padding:0 24px; box-sizing:border-box; }
    .social-links:empty { display:none; }
    .social-link { display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:44px; padding:10px 18px; border-radius:14px; color:#fff; text-decoration:none; font-weight:700; box-sizing:border-box; }
    .social-link.facebook { background:#1877F2; }
    .social-link.telegram { background:#229ED9; }
    .social-link svg { width:20px; height:20px; flex:0 0 20px; }
    @media(max-width:600px) { .social-links { padding:0 30px; margin-top:12px; } .social-link { flex:1 1 130px; } }
  `;
  document.head.appendChild(style);
})();

async function loadSocialLinks() {
  let container = document.getElementById('social-links');
  if (!container) {
    container = document.createElement('div');
    container.id = 'social-links';
    container.className = 'social-links';
    container.setAttribute('aria-label', 'Social media links');
    // Place the buttons after the hero section when possible, otherwise before the player links.
    const hero = document.querySelector('.hero');
    const controls = document.querySelector('.controls');
    if (hero && hero.parentNode) hero.insertAdjacentElement('afterend', container);
    else if (controls && controls.parentNode) controls.insertAdjacentElement('beforebegin', container);
    else {
      const main = document.querySelector('main') || document.body;
      main.insertBefore(container, main.firstChild);
    }
  }
  if (!configured) return;
  try {
    const { data, error } = await client.from('site_settings')
      .select('setting_key,setting_value')
      .in('setting_key', ['facebook_url', 'telegram_url']);
    if (error) throw error;
    const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
    const facebook = validUrl(settings.facebook_url || '');
    const telegram = validUrl(settings.telegram_url || '');
    const fbSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M13.4 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.2V13H10v8h3.4z"/></svg>';
    const tgSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M21.7 4.4 18.5 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.6 1.1 12c-1.1-.3-1.1-1.1.2-1.6L20.4 3c.9-.3 1.6.2 1.3 1.4z"/></svg>';
    container.innerHTML = [
      facebook ? `<a class="social-link facebook" href="${esc(facebook)}" target="_blank" rel="noopener noreferrer">${fbSvg}<span>Facebook</span></a>` : '',
      telegram ? `<a class="social-link telegram" href="${esc(telegram)}" target="_blank" rel="noopener noreferrer">${tgSvg}<span>Telegram</span></a>` : ''
    ].join('');
  } catch (e) {
    console.warn('Hindi ma-load ang Facebook/Telegram settings:', e);
  }
}

load();
loadSocialLinks();
