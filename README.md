# Vaagdevi College — AI Lost & Found Platform (Prototype)

A working prototype of an AI-powered lost & found system: React + Supabase (Auth, Postgres,
Storage, Realtime) + OpenAI (vision + embeddings) + Vercel.

This is scoped as a **real, runnable core** of the full brief — auth restricted to college
emails, item reporting with photo upload, AI image analysis (category/color/OCR-ish text
extraction), automatic similarity-based matching between lost and found items, a match-scoped
secure chat, live notifications, and an admin panel with verification + moderation + basic
analytics. It is not the entire enterprise system in one pass — see "What to extend first" below
for the highest-leverage next steps.

---

## 1. Stack & how the pieces fit together

```
React (Vite + TS + Tailwind)
   |
   |-- Supabase Auth        (email/password, restricted to @vaagdevi.edu.in)
   |-- Supabase Postgres    (profiles, items, matches, messages, notifications + RLS)
   |-- Supabase Storage     (item photos, public bucket "item-images")
   |-- Supabase Realtime    (live notifications + chat messages)
   |-- Supabase Edge Fns    (analyze-item, compute-matches — call OpenAI)
   |        |-- OpenAI gpt-4o-mini (vision: category / color / OCR text / description)
   |        |-- OpenAI text-embedding-3-small (semantic similarity via pgvector)
   |
   -- deployed on Vercel, DB/Auth/Storage/Functions on Supabase
```

The matching pipeline, concretely:
1. User uploads a photo with their lost/found report.
2. `analyze-item` edge function sends the photo to GPT-4o-mini, which returns structured JSON
   (category, color, visible text/brand, distinguishing features, a clean description).
3. That JSON + the user's own title/description is embedded with
   `text-embedding-3-small` and stored on the `items.embedding` column (pgvector).
4. `compute-matches` finds nearest-neighbor items of the opposite type (lost ↔ found) via
   cosine similarity (`find_candidate_matches` SQL function using an ivfflat index), then nudges
   the score up/down for matching category, color, location, and date proximity.
5. Matches above a threshold write rows into `matches` and fire realtime `notifications` to both
   reporters.

---

## 2. Project structure

```
supabase/
  migrations/
    0001_init.sql       # tables, enums, RLS policies, pgvector index, match RPC
    0002_storage.sql     # "item-images" bucket + storage policies
  functions/
    analyze-item/        # edge function: vision analysis + embedding
    compute-matches/      # edge function: similarity search + match writing
src/
  lib/
    supabaseClient.ts     # Supabase client singleton
    AuthContext.tsx       # session + profile React context
  types/index.ts           # shared TS types mirroring the DB schema
  components/
    Navbar.tsx             # nav + realtime notification bell
    ItemCard.tsx            # item grid card
    ChatPanel.tsx            # realtime match chat
    ProtectedRoute.tsx        # auth/verification/admin route guard
  pages/
    Login.tsx, Signup.tsx
    Dashboard.tsx              # campus board: browse/filter/search items
    ReportItem.tsx              # report form + photo upload + triggers AI
    ItemDetail.tsx                # item view + AI attributes + ranked matches + chat
    AdminPanel.tsx                 # verification, moderation, analytics
  App.tsx, main.tsx
```

---

## 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then `0002_storage.sql`
   (in that order — the second depends on tables from the first).
   - If `create extension vector` fails, enable **pgvector** from
     Database → Extensions in the dashboard first, then re-run.
3. Note your **Project URL** and **anon public key** (Settings → API) — these go in `.env`.
4. Deploy the edge functions (requires the [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set OPENAI_API_KEY=sk-...
   supabase functions deploy analyze-item
   supabase functions deploy compute-matches
   ```
5. **Bootstrap your first admin**: sign up normally through the app, then in the SQL editor:
   ```sql
   update public.profiles set role = 'admin', is_verified = true where email = 'you@vaagdevi.edu.in';
   ```
   Every other account starts as `is_verified = false` until an admin approves them from the
   Admin Panel — this models the "verified college member" gate from the brief.

## 4. Run locally

```bash
npm install
cp .env.example .env       # then fill in your Supabase URL + anon key
npm run dev                # http://localhost:5173
```

## 5. Deploy

- **Push to GitHub**, then import the repo in **Vercel**.
- Framework preset: Vite. Build command `npm run build`, output dir `dist`.
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment variables.
- Edge functions and the OpenAI key live in **Supabase**, not Vercel — Vercel only serves the
  static React app, which calls Supabase directly from the browser.

---

## 6. What I'd extend first

Roughly in priority order:

1. **Real SSO instead of email/password.** The brief says "log in using their college
   credentials" — that likely means SAML/OAuth against the college's identity provider, not a
   Supabase email signup. Supabase Auth supports SAML SSO and OAuth providers; this is a config
   change plus swapping `Login.tsx`/`Signup.tsx` for a provider button, no schema changes needed.
2. **Claim confirmation flow.** Right now a "confirmed" match just opens a chat. Add a step where
   both parties mark the handover as complete (maybe with a photo or admin sign-off), which flips
   `items.status` to `claimed` on both records and closes the match — this is the actual
   "resolution" the analytics should be counting.
3. **Server-side image moderation before storage**, since uploads are user-generated content on
   a public board — run the OpenAI moderation endpoint (or a vision safety check) before the
   image is shown to other users, not just after.
4. **OCR-quality boost for ID cards.** GPT-4o-mini vision is decent at reading printed text but
   will still miss handwriting or glare. For ID cards/documents specifically, consider a
   dedicated OCR pass (e.g. Google Vision OCR or Tesseract) feeding into the same embedding, and
   make sure any extracted personal data (name, roll number) is only ever shown to the matched
   counterparty, not the public board.
5. **Push notifications**, not just in-app realtime — a service worker + Web Push (or a mobile
   wrapper) so students get notified even when the tab isn't open. This is the highest-impact
   change for actual campus adoption.
6. **Rate limiting / abuse controls** on `analyze-item` (each call costs real OpenAI credits) —
   e.g. a per-user daily report cap enforced in the edge function before calling OpenAI.
7. **Admin analytics depth**: recovery rate over time, average time-to-match, hotspot locations
   (where things get lost most) — the `items`/`matches` tables already have everything needed;
   it's a matter of adding aggregate queries and a charting library (recharts) to `AdminPanel.tsx`.
8. **Automated tests.** None exist yet. Start with the matching logic in `compute-matches`
   (pure-ish scoring function) and the RLS policies (Supabase has a `pgTAP`-based testing pattern)
   since those are the two places a bug is most costly.

## 7. Known prototype limitations (by design, to keep this runnable end-to-end)

- Matching runs synchronously when you upload a photo — fine for a demo/small campus, but at
  scale you'd move `analyze-item` → a queue (e.g. Supabase's pg_cron + a job table) so uploads
  don't block on OpenAI latency.
- The "college credentials" login is email/password gated by domain + manual admin verification,
  not real SSO (see extension #1).
- No image moderation pass yet (see extension #3).
- Admin analytics is counts-only, no time-series (see extension #7).
