SWERTENG LINK — ANALYTICS + PWA

1) Backup your GitHub repo first.
2) Replace root files: admin.html, admin.js, public.js, index.html, styles.css, config.js. Keep config.js as provided; it contains the frontend publishable/anon key only, never a service_role secret.
3) In Supabase SQL Editor, run SUPABASE-ANALYTICS.sql. Confirm the admin UUID in the policy matches your Supabase Auth user.
4) Upload manifest.webmanifest, sw.js, and icon.svg to the website root.
5) Wait for Cloudflare Pages deployment. Test a page visit and player link click, then refresh Analytics in admin. Counts start after deployment and are not historical. Dashboard reads up to the latest 5,000 events.
6) On Android Chrome, open the public site menu ⋮ and choose Install app or Add to Home screen if offered. PWA installation depends on browser support and HTTPS.

Note: files prepared from your latest uploaded source and not live-tested against Supabase. Do not expose service_role keys in frontend config.
