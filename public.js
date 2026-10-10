const cfg = window.SWERTENG_LINK_CONFIG || {};
const configured = typeof cfg.SUPABASE_URL === 'string' && cfg.SUPABASE_URL.startsWith('https://') && typeof cfg.SUPABASE_ANON_KEY === 'string' && cfg.SUPABASE_ANON_KEY.length > 20 && !cfg.SUPABASE_ANON_KEY.includes('PASTE_');
const client = configured && window.supabase?.createClient ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
let allLinks = [], category = 'All';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUrl = s => { try { const u = new URL(s); return ['http:', 'https:'].includes(u.protocol) ? u.href : null; } catch { return null; } };

// Analytics: report the exact failure in the browser console without blocking navigation.
async function trackAnalyticsEvent(eventType, playerLinkId = null) {
  if (!['visit', 'click'].includes(eventType)) {
    console.error('[analytics] Refusing unknown event type:', eventType);
    return false;
  }
  if (!client) {
    console.error('[analytics] Supabase client is unavailable. Check config.js, script order, and the Supabase JS CDN.');
    return false;
  }
  try {
    const row = { event_type: eventType };
    // The table's player_link_id may be nullable; only attach it for click events.
    if (eventType === 'click' && playerLinkId !== null && playerLinkId !== '') {
      const parsedId = Number(playerLinkId);
      row.player_link_id = Number.isFinite(parsedId) ? parsedId : playerLinkId;
    }
    const { error } = await client
      .from('analytics_events')
      .insert(row);
    if (error) {
      console.error('[analytics] Insert failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        event: row
      });
      return false;
    }
    console.info('[analytics] Event insert accepted:', eventType);
    return true;
  } catch (error) {
    console.error('[analytics] Unexpected error:', error?.message || error);
    return false;
  }
}
// Expose a test hook so the event can be triggered manually from the browser console.
window.trackAnalyticsEvent = trackAnalyticsEvent;

function renderSocialLinks(settings) {
  const container = $('social-links') || $('socialLinks');
  if (!container) return;
  const facebook = validUrl(settings.facebook_url);
  const telegram = validUrl(settings.telegram_url);
  const links = [];
  if (facebook) links.push(`<a class="social-link facebook" href="${esc(facebook)}" target="_blank" rel="noopener noreferrer"><span class="social-icon" aria-hidden="true">f</span><span>Facebook</span></a>`);
  if (telegram) links.push(`<a class="social-link telegram" href="${esc(telegram)}" target="_blank" rel="noopener noreferrer"><span class="social-icon" aria-hidden="true">➤</span><span>Telegram</span></a>`);
  container.innerHTML = links.join('');
}

async function loadSocialLinks() {
  const container = $('social-links') || $('socialLinks');
  if (!container) return;
  if (!client) { container.innerHTML = ''; return; }
  try {
    const { data, error } = await client.from('site_settings').select('setting_key,setting_value').in('setting_key', ['facebook_url', 'telegram_url']);
    if (error) throw error;
    const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
    renderSocialLinks(settings);
  } catch (error) {
    console.warn('Social links could not be loaded:', error.message || error);
    // Keep the page usable if social settings are not configured or readable.
    renderSocialLinks({});
  }
}

function render() {
  const search = $('search');
  const filters = $('filters');
  const links = $('links');
  if (!search || !filters || !links) return;
  const q = search.value.trim().toLowerCase();
  const categories = ['All', ...new Set(allLinks.map(x => x.category).filter(Boolean).sort((a, b) => a.localeCompare(b)))];
  if (!categories.includes(category)) category = 'All';
  filters.innerHTML = categories.map(c => `<button class="chip ${c === category ? 'active' : ''}" data-category="${esc(c)}">${c === 'All' ? 'Lahat' : esc(c)}</button>`).join('');
  const filtered = allLinks.filter(x => (category === 'All' || x.category === category) && [x.name, x.category, x.description].some(v => String(v || '').toLowerCase().includes(q)));
  if ($('count')) $('count').textContent = allLinks.length;
  if ($('cats')) $('cats').textContent = Math.max(0, categories.length - 1);
  links.innerHTML = filtered.length ? filtered.map(x => {
    const url = validUrl(x.url);
    const logo = validUrl(x.logo_url);
    const icon = logo
      ? `<img class="player-logo" src="${esc(logo)}" alt="${esc(x.name)} logo" loading="lazy" style="width:42px;height:42px;flex:0 0 42px;object-fit:contain;border-radius:13px;background:#ffffff0b;padding:3px" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'linkicon',textContent:'↗'}))">`
      : '<span class="linkicon">↗</span>';
    return `<article class="card" data-link-id="${esc(x.id)}"><div class="cardtitle">${icon}<div><h3>${esc(x.name)}</h3><span class="category">${esc(x.category)}</span></div></div><p class="muted description">${esc(x.description || 'Player link')}</p>${url ? `<a class="button primary open" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Buksan ang link ↗</a>` : ''}</article>`;
  }).join('') : '<div class="empty">Walang nahanap na links.</div>';
}

if ($('search')) $('search').addEventListener('input', render);
if ($('filters')) $('filters').addEventListener('click', e => {
  const button = e.target.closest('[data-category]');
  if (button) { category = button.dataset.category; render(); }
});

async function load() {
  if (!configured) {
    if ($('links')) $('links').innerHTML = '<div class="empty">Hindi pa nakakabit ang database. I-setup ang Supabase at config.js ayon sa README.</div>';
    return;
  }
  try {
    const { data, error } = await client.from('player_links').select('id,name,category,url,description,logo_url').eq('is_active', true).order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    allLinks = data || [];
    render();
    if ($('notice')) $('notice').textContent = '';
  } catch (error) {
    if ($('links')) $('links').innerHTML = '<div class="empty">Hindi ma-load ang links. Tingnan ang Supabase setup at database policies.</div>';
    if ($('notice')) $('notice').textContent = error.message || 'Database error';
  }
}

// Track clicks without preventing the destination from opening.
if ($('links')) $('links').addEventListener('click', e => {
  const link = e.target.closest('a.open');
  if (!link) return;
  const card = link.closest('[data-link-id]');
  if (card) void trackAnalyticsEvent('click', card.dataset.linkId);
});

// Record visit and load page content independently so one failure does not block the other.
console.info('[analytics] Startup check:', { configured, clientAvailable: !!client, supabaseLibraryAvailable: !!window.supabase });
void trackAnalyticsEvent('visit');
void loadSocialLinks();
void load();
