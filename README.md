# APEX AI

A personal optimization platform covering training, skin health and daily discipline. It's built with Next.js 15 (App Router), SQLite, the Claude API and on-device MediaPipe vision.

## Quick start

```bash
npm install          # also copies MediaPipe WASM into public/mediapipe
cp .env.example .env # add ANTHROPIC_API_KEY to enable AI features
npm run dev          # http://localhost:3000
```

Production: `npm run build && npm start`. Set `APEX_ENCRYPTION_KEY` (64 hex chars) in production. Without it, the server refuses to store photos.

Tests: `npm test` (engines, data integrity, safety rules, Markdown renderer). Typecheck: `npm run typecheck`.

## What works without an API key

Everything except three features: AI photo analysis, the physique scan, and the coach's conversational mode. The coach falls back to an **offline assistant** that answers the core questions straight from the user's data and APEX's databases: what to train today, exercises for a muscle, what an ingredient does, comparing two treatments, how to order a routine, what the workout history shows, and which habits to focus on. On-device facial measurement and pose overlays also work offline.

## Architecture

```
src/
  app/
    (auth)/login, register        public pages
    onboarding/                   4-step setup → generates program + routine
    (app)/home|face|skincare|fitness|exercises|coach|progress|profile
    api/…                         JSON route handlers (zod-validated, uniform errors)
  lib/
    db.ts            SQLite schema + migrations (WAL, FK cascade on user delete)
    auth.ts          bcrypt passwords, hashed session tokens, httpOnly cookies, origin check, rate limits
    storage.ts       AES-256-GCM encrypted photo files, outside /public
    ai.ts            Claude client, structured outputs, streaming, shared safety rules
    analysis.ts      face/body report schemas + system prompts
    prompts.ts       coach system prompts (assistant / appearance modes)
    repo.ts          data-access helpers
    face-metrics.ts  landmark → proportion maths (browser)
    vision.ts        MediaPipe loaders (self-hosted models)
    engine/
      program.ts     deterministic program generator (5 splits, 2–6 days, goals, equipment, time budget)
      analytics.ts   consistency, volume per muscle, e1RM trends, recovery & imbalance insights
      routine.ts     rule-based AM/PM skincare builder with compatibility & pregnancy rules
      motivation.ts  context-driven daily message, quote, challenge, reflection
      assistant.ts   AI context builder + offline assistant
    data/
      exercises-*.ts 89 exercises × 11 muscle groups
      compounds.ts   53 skincare / dermatology / hormonal / anabolic education entries
  components/        UI kit, anatomy map, movement demos, feature components
```

## Safety & privacy decisions

- **No attractiveness scores, worth-based metrics or body-fat targets.** Facial measurements are shown as neutral ratios with no "ideal". AI prompts forbid rating, age/ethnicity guesses, genetic inference and diagnosis.
- **Pharmaceutical content is educational only.** There's no dosing, cycling, stacking or sourcing information anywhere. High-risk drugs (isotretinoin, AAS, SARMs, aromatase inhibitors, SERMs, TRT, finasteride, systemic steroids) are flagged, and tests verify they're never auto-suggested. Face reports suggest only OTC ingredients. Prescription options appear only as "ask a dermatologist about" education.
- **Photos.** Landmark detection runs in the browser, and only ~11 aggregate ratios reach the server. No landmark mesh or biometric template is stored. EXIF/GPS is stripped by re-encoding the image client-side. A photo is sent to the AI only when the user asks for analysis, after explicit consent. It's stored only if the user ticks "save", is encrypted at rest, is served only to its owner, and can be deleted individually or all at once.
- **Minors.** Users under 13 can't register. For ages 13–17, photo analysis, photo storage and AI memory are disabled, and the coach is told to be conservative.
- **AI memory** is opt-in. The coach proposes a memory and nothing is saved until the user approves it. Memories are viewable and deletable, and turning the feature off wipes them.
- **Data rights:** JSON export and password-confirmed account deletion (cascades to every table and removes photo files).

## Known limitations

- The movement demos are stylised stick-figure animations of each movement *pattern*, not filmed demonstrations. Each exercise also links to a YouTube search for video.
- Reference links open pre-searched queries on DailyMed, MedlinePlus, NCBI Bookshelf and PubMed rather than specific article URLs, so they can't go stale or point at the wrong paper.
- SQLite suits single-instance deployments. For horizontal scaling, swap `db.ts` for Postgres (the SQL is portable) and move photos to object storage.
- AI photo analysis, the physique scan and conversational coaching haven't been exercised against the live API in this build environment, which had no API key. Request shapes are type-checked against the SDK and the schemas are verified to convert.
