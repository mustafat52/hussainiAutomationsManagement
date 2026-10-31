# Hussaini Automations — Project Hub

A one-page internal dashboard for tracking every client project: quotations, statuses,
technical details, which of your accounts a project runs on, maintenance/retainer income,
expenses, encrypted credentials and project files.

Data lives in **Supabase** (Postgres + Storage) and the app is an installable **PWA**, so it works
the same on your laptop and your phone.

## 1. One-time Supabase setup

1. Create a project at https://supabase.com.
2. **SQL Editor → New query** → paste the contents of `supabase/schema.sql` → **Run**.
   (Creates the tables, the private `project-files` storage bucket and the security rules. Safe to re-run.)
3. **Authentication → Users → Add user** → create yourself (email + password, tick "Auto confirm").
4. **Authentication → Sign In / Providers** → turn **OFF** "Allow new users to sign up".
   This keeps you the only person who can ever log in.
5. **Project Settings → API** → copy the Project URL and the `anon` (or `publishable`) key.

## 2. Configure

```bash
npm install
cp .env.local.example .env.local   # then fill it in
```

`MASTER_KEY` must be the **same value you used before** — it decrypts the credentials already
stored in your vault.

## 3. Move your existing data (once)

```bash
npm run migrate -- --dry-run   # preview: shows what it found, writes nothing
npm run migrate                # copies everything into Supabase and verifies the counts
```

It reads `data/agency.db` and `data/uploads/` (read-only) and is safe to re-run.
After you've checked the data in the app, keep `data/` as a backup.

## 4. Run

```bash
npm run dev      # http://localhost:3000
```

## 5. Deploy (so your phone can reach it)

Push to GitHub, import the repo in Vercel, and add these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `MASTER_KEY`

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel — it's only for the migration script.

Then open the Vercel URL on your phone → browser menu → **Add to Home Screen / Install app**.

## Notes

- Everything is behind login. Logged-out visitors are redirected to `/login`; API calls return 401.
- Credentials are encrypted by the app (AES-256-GCM) before they're stored, so they're unreadable
  even inside the Supabase dashboard.
- The service worker caches no data, so you always see live numbers. Offline you'll just see a notice.
- Files upload directly from the browser to Supabase Storage (50 MB per file on the free plan).
