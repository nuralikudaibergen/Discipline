# Nurali — Plan. Learn. Repeat.

A premium dark-themed daily planning + English/Russian vocabulary workspace,
built with **Next.js 14 (App Router)**, **Tailwind CSS**, **Shadcn-style
components**, **Lucide icons**, **Framer Motion**, and **Recharts**. State is
persisted in **LocalStorage** (MVP) so it can be migrated to Supabase later
without touching the UI.

## What's in this build

### Core data + state
- `app/` — App Router shell, dark-mode `<html>`, `globals.css` design tokens,
  3D-flip CSS utilities.
- `lib/types.ts` — `Word` / `Task` / `TestResult` / `ProgressSnapshot` models
  + `DayIndex` brand + `toDayIndex()` helper.
- `lib/storage.ts` — LocalStorage persistence + gate/streak logic.
  - `recordTestPass()` maintains the daily streak (yesterday → +1, today →
    idempotent, anything else → 1).
  - One-shot migration: words saved before the `userAdded` flag get tagged
    `true` on next load (so the user's own words stay attributed to them).
- `lib/translate.ts` — MyMemory-backed EN→RU translator with cache + 300ms
  throttle. Returns a tagged union (`{ ok, text }` / `{ ok: false, reason }`)
  so the UI can distinguish empty results from network failures.
- `lib/word-pool.ts` — Built-in seed pool (~50 EN→RU pairs, kept for
  reference / future seeding) and the `pickDailyWords(userBank, n)` selector
  that draws **only from the user's bank** — no seed mix.
- `lib/notifications.ts` — Native browser `Notification` API wrapper.
  Schedules a one-shot timer per task for its next (day, time) occurrence.
  The React layer registers an `onFired` handler that rolls each timer
  forward by one week, so reminders repeat weekly.
- `lib/use-app-state.ts` — React hook; mutations return new state and
  auto-persist. Designed to be swapped for Supabase queries.

### UI components
- `components/ui/{card,button,input,progress}.tsx` — Shadcn-style primitives.
- `components/flashcard.tsx` — 3D-flip card with `speechSynthesis` Listen.
- `components/gatekeeper.tsx` — Two-phase flow:
  1. **Flashcards** — animated walkthrough of today's words.
  2. **Quiz** — randomized EN→RU / RU→EN multiple choice + "type your
     answer" fallback. Score recorded, then a single **Open dashboard**
     button switches the view.
  - Empty-state with **Open Vocabulary** CTA when the user has 0 words.
- `components/animated-checkbox.tsx` — Spring-animated check with line-through
  + fade on parent (used by the schedule).
- `components/week-schedule.tsx` — Mon–Sun day selector, add/edit/delete
  tasks, double-click to rename, animated check-off, completion %, optional
  per-task **time** and **browser notification** toggle.
- `components/vocabulary-panel.tsx` — Add EN words, **auto-translates to RU
  via MyMemory** as you type (with retry + error banner on failure), search +
  delete.
- `components/progress-charts.tsx` — Recharts weekly completion bar chart +
  word bank growth line chart, with stat cards and mock-data safety.
- `components/dashboard.tsx` — Tabbed shell (Schedule / Progress / Words) with
  animated tab indicator, topbar (logo, streak badge, "Re-test gate" button).
- `components/app.tsx` — Top-level orchestrator. The **Gatekeeper is the
  default view on every page load**; the user switches to the Dashboard via
  a button in the shared top bar. Re-records progress whenever tasks/words
  change so the chart is always in sync.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The Gatekeeper is the first thing you see.
Add a few English words from the **Words** tab in the Dashboard to populate
your bank, then head back — the next 10 words (or however many you have) are
randomly picked from your bank and a fresh quiz is built.

State persists in `localStorage` under `nurali:state:v1`.

> Tip: the **Re-test gate** button in the Dashboard topbar clears
> `lastTestDate` and re-rolls the 10 random cards, so you can demo the
> Gatekeeper flow without waiting 24 hours.

## Deploying to Vercel

The app is a static Next 14 build — no server runtime, no env vars, no
database. The shortest path:

### Option A — GitHub import (recommended)

1. Push the repo to GitHub (see "Push to a new repo" below).
2. On https://vercel.com/new, click **Import** next to your repo.
3. Framework preset auto-detects **Next.js**. Leave the build command
   (`next build`) and output (`.next`) as-is.
4. **Deploy**. Vercel assigns a `*.vercel.app` URL in ~30 seconds.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel              # first run: links / creates a project
vercel --prod       # promote to production
```

### Push to a new repo

```bash
git init
git add -A
git commit -m "feat: gatekeeper, schedule, vocabulary, charts"
gh repo create nurali --public --source=. --remote=origin --push
# or:  git remote add origin <your-url> && git push -u origin main
```

### Notes

- **No env vars** are required. The app uses `localStorage` for state and
  the public MyMemory endpoint for translation. (For real production traffic
  you'd want a Supabase / KV layer; the data model and `useAppState` hook
  are already shaped to be swapped without UI changes.)
- **Browser notifications** will not fire on a remote URL without HTTPS —
  Vercel serves HTTPS by default, so they work out of the box once the user
  grants permission.
- The site is a static build (`○ (Static)` in the build output) — Vercel
  serves it from the edge cache.

## Roadmap (next commits)

- **Step 3** — Native browser notifications per task (time + day). ✅ shipped.
- **Step 4** — Sound effects when a task is checked off.
- **Step 5** — Supabase migration (the data model and hook are already shaped
  to be swapped without UI changes).
