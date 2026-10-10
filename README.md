# SWERTENG LINK — PWA + public directory

This is a mobile-friendly installable web app starter. It includes:
- Public player-link directory (`index.html`)
- Admin PWA (`admin.html`) with Supabase email/password login
- Add, edit, delete, activate/deactivate, search
- Shared Supabase database
- Manifest and service worker for Home Screen installation

## 1. Create a Supabase project
1. Create a project at https://supabase.com/
2. In Project Settings / API, copy the **Project URL** and the **publishable key** (or legacy `anon` key).
3. Open `config.js` and replace both placeholders.
4. Never use the `service_role` or secret key in `config.js`.

## 2. Create the table
1. In Supabase, open **SQL Editor**.
2. Run `supabase_schema.sql`.
3. Important: the starter SQL policies allow any authenticated user to manage rows. For a safer setup, use the admin-only policy below before launch.

### Restrict edits to one admin (recommended)
1. In Supabase Authentication, create your admin user.
2. Open Authentication > Users and copy that user's UUID.
3. In SQL Editor, run this, replacing `YOUR_ADMIN_USER_UUID` with the UUID:
```sql
drop policy if exists "Authenticated users can read all links" on public.player_links;
create policy "Only designated admin can read all"
on public.player_links for select to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

drop policy if exists "Authenticated admins can insert links" on public.player_links;
drop policy if exists "Authenticated admins can update links" on public.player_links;
drop policy if exists "Authenticated admins can delete links" on public.player_links;

create policy "Only designated admin can insert"
on public.player_links for insert to authenticated
with check (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

create policy "Only designated admin can update"
on public.player_links for update to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid)
with check (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

create policy "Only designated admin can delete"
on public.player_links for delete to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);
```
4. In Authentication > Settings, disable public signups if you do not need anyone else to register. Keep the admin account private.
5. Confirm RLS is enabled and test in a private/incognito window: visitors should see active links but should not be able to write.

## 3. Upload to GitHub
1. Extract this ZIP.
2. In your `swerteng-link` GitHub repository, choose **Add file > Upload files**.
3. Upload all files from the extracted folder (not the ZIP itself), including `index.html`, `admin.html`, `config.js`, `public.js`, `admin.js`, `styles.css`, `manifest.webmanifest`, `icon.svg`, `sw.js`, and `supabase_schema.sql`.
4. Commit changes to `main`.

## 4. Deploy with Cloudflare Pages
1. Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git.
2. Select repository `swerteng-link` and branch `main`.
3. Framework preset: None. Build command: leave blank (or `exit 0` if required). Build output directory: `/` if offered for a root static site.
4. Deploy and wait for your `*.pages.dev` address.
5. HTTPS is required for PWA install.

## 5. Install on Android
1. Open your live `https://YOUR-PROJECT.pages.dev/admin.html` in Chrome.
2. Sign in with the Supabase admin account.
3. Chrome menu `⋮` > **Add to Home screen** or **Install app**.
4. The icon opens the admin panel. The public directory is at the root URL.

## 6. How it works
- Add/Edit/Delete changes are stored in Supabase and shared with the public site.
- Public site displays only active links.
- Admin listing fetches the latest 1,000 rows at a time in this starter. For very large datasets, add pagination/infinite scrolling.
- There is no hard-coded limit of 50 links; actual scale depends on Supabase quotas and plan limits.
- PWA shell files may cache for offline loading, but database actions require internet.

## Important security notes
- `config.js` is public. Only place the Supabase URL and publishable/anon key there.
- Never expose `service_role`/secret keys.
- Apply the admin-only UUID policies above before putting real links online.
- Do not share admin credentials. Use a strong, unique password and enable MFA if available.
- This project has not been deployed or connected to your accounts for you; you must configure Supabase and GitHub.
