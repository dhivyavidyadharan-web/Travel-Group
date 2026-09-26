# TripSync

A group trip planner that replaces the endless WhatsApp thread. The coordinator shares **one link**. Everyone submits their dates, budget, preferred trip types and dealbreakers. The app works out the hard limits in code, asks Gemini for 3 options inside those limits, checks the reply, and shows **where each person stands on each option**. The group votes and the coordinator locks the final decision.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres) · Google Gemini (`@google/genai`) · Nager.Date (optional long-weekend tags)

## How it works

| Page | Who | What |
| --- | --- | --- |
| `/` | Coordinator | Create a trip: name, date window, trip length, people, deadline |
| `/t/[id]/admin?key=…` | Coordinator only | Share link, response tracker (✅/⏳ + WhatsApp nudges), **Generate options**, **Lock final decision** |
| `/t/[id]` | Everyone | 2-minute form, no login. Resubmitting updates your answer (never a duplicate) |
| `/t/[id]/results` | Everyone | Recommendation, group snapshot, 3 option cards, fit matrix, voting |
| `/demo` | Anyone | One click: a trip with 5 friends who have all responded |

**Split between code and AI**

- `lib/constraints.ts` (pure, unit tested) works out the common date windows (or, if there's no full overlap, the windows the most people can make, with who misses out), the budget ceiling (lowest max) and floor (highest min), the combined dealbreakers with who set each one, and destination-type scores (3/2/1 points).
- `lib/gemini.ts` sends the preferences plus those constraints to Gemini with a strict `responseSchema`.
- `lib/validate.ts` checks the reply with zod and **drops any option** that goes over the budget ceiling, falls outside the date windows or trip length, misses anyone's fit score, or breaks a personal travel rule (e.g. a flight for someone who won't fly, over 8h for someone who said no). It then works out `groupFit` (average) and `minFit` (lowest) itself. If fewer than 3 options survive, it retries once with the problems spelled out.
- Results are saved, so they don't change on refresh. Regenerating is an explicit admin action and clears votes and any lock.

**Access model:** there are no accounts. The trip ID (a UUID) is the share link, and a random 32-character admin key protects the dashboard. All database access goes through server code with the service-role key. RLS is on, with no public policies.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Go to **Project Settings → API** and copy the **Project URL**, the **anon** key and the **service_role** key.

## 2. Get a Gemini key

Create an API key at [Google AI Studio](https://aistudio.google.com/apikey).

## 3. Environment variables

Copy `.env.example` to `.env.local` for local development, then add the same variables in Vercel under **Project → Settings → Environment Variables**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (server only, keep it secret) |
| `GEMINI_API_KEY` | Gemini API key (server only) |
| `GEMINI_MODEL` | `gemini-2.5-flash` (optional; this is the default) |
| `GEMINI_MOCK` | Optional. `1` returns canned options without calling Gemini (handy for local UI work) |

## 4. Run locally

```bash
npm install
npm run dev        # http://localhost:3000, then open /demo
npm test           # constraint and validation unit tests
npm run build
```

## 5. Deploy to Vercel

**Option A: GitHub import (recommended)**

1. Push this repo to GitHub.
2. At [vercel.com/new](https://vercel.com/new), import the repo. The framework is detected as Next.js, so there's nothing to change.
3. Add the environment variables above and click **Deploy**.

**Option B: CLI**

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GEMINI_API_KEY
vercel --prod
```

After deploying, open `https://<your-app>.vercel.app/demo` to test the full flow.

## Deliberately not built

Live flight or hotel prices, bookings, payments, chat, user accounts, and email or SMS notifications. The tool gives a **recommendation**; the group still makes the decision.
