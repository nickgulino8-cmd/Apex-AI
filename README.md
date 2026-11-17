# APEX AI

A personal optimization platform covering training, skin health and daily discipline. It's built with Next.js 15 (App Router), SQLite, the Claude API and on-device MediaPipe vision.

## Install on your phone

Open **https://nickgulino8-cmd.github.io/Apex-AI/** on your phone:

- **iPhone:** in **Safari**, tap Share → **Add to Home Screen**.
- **Android:** in **Chrome**, tap ⋮ → **Install app**.

APEX then runs full-screen from your home screen and works offline.

**Everything stays on your phone.** There's no account and no server. Your workouts, routines, habits, reports and photos are stored in on-device storage (SQLite compiled to WebAssembly and saved in IndexedDB). Use **Profile → Download backup** now and then: deleting the home-screen app or clearing the browser's website data erases it.

**AI features** (face analysis and ratings, physique scan, chat coach) use your own Anthropic API key. Paste it in **Profile → AI**. It's stored only on the phone, and requests go directly from the phone to Anthropic. Every other feature works without a key.

## Development

```bash
npm install          # also copies the MediaPipe + SQLite WASM runtimes into public/
npm run dev          # http://localhost:3000
npm test             # engines, data integrity, safety rules, UI render tests
npm run build        # static export → out/
```

Pushing to `main` runs typecheck, tests and the build, then publishes `out/` to GitHub Pages (`.github/workflows/ci.yml`).

## Architecture

```
src/
  app/
    (auth)/login, register        public pages
    onboarding/                   4-step setup → generates program + routine
    (app)/home|face|skincare|fitness|exercises|coach|progress|profile
  localapi/…                      request handlers that run in the browser (zod-validated)
  lib/local-fetch.ts              routes the UI's /api/... calls to those handlers on the device
  lib/
    db.ts            on-device SQLite (sql.js) + migrations, persisted to IndexedDB
    auth.ts          single on-device profile (the phone's lock screen protects it)
    storage.ts       photos as blobs in on-device IndexedDB
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

- **Ratings.** Facial (harmony, angularity, dimorphism, features) and physique (proportions, development, symmetry, definition) ratings on a 1–10 scale with a likely range, plus the pillar the user leans toward and non-drug, non-surgical changes they can make. Ratings come from a separate model call, so a declined rating never blocks the skin or muscle report. Adults only, on by default with a Profile toggle. The dimorphism reference is chosen by the user, never inferred. Prompts forbid race, ethnicity or skin tone affecting scores, and forbid incel/blackpill vocabulary. Landmark inputs: thirds, symmetry, jaw/cheek ratio, canthal tilt, FWHR and midface ratio.
- **Prescription content.** Face reports recommend prescription dermatology options (retinoids including isotretinoin, topical/oral antibiotics, spironolactone, hydroquinone, rosacea treatments, finasteride/minoxidil for hair loss, and others) with why and what to expect, framed for a dermatologist visit. No doses or sourcing. Anabolic steroids, SARMs, testosterone, aromatase inhibitors, SERMs and systemic steroids are never recommended; they stay as education only, and tests enforce this. Pregnancy flags strip teratogenic options.
- **Photos.** Landmark detection runs on the phone, and the landmark mesh is discarded after drawing (only ~11 aggregate ratios are kept). EXIF/GPS is stripped by re-encoding the image. A photo leaves the phone only when you run an AI analysis, after explicit consent, and goes straight to Anthropic with your key. It's saved only if you tick "save", stays on the device, and can be deleted individually or all at once.
- **Minors.** Users under 13 can't register. For ages 13–17, photo analysis, photo storage and AI memory are disabled, and the coach is told to be conservative.
- **AI memory** is opt-in. The coach proposes a memory and nothing is saved until the user approves it. Memories are viewable and deletable, and turning the feature off wipes them.
- **Your data:** full backup/restore file, JSON export, and "Erase everything" (removes the database, photos and stored API key from the device).

## Known limitations

- The movement demos are stylised stick-figure animations of each movement *pattern*, not filmed demonstrations. Each exercise also links to a YouTube search for video.
- Reference links open pre-searched queries on DailyMed, MedlinePlus, NCBI Bookshelf and PubMed rather than specific article URLs, so they can't go stale or point at the wrong paper.
- Data lives on one device and doesn't sync between phones. Move it with Download backup → Restore backup. Backups don't include photos.
- iOS can clear website storage for sites that aren't added to the home screen and go unused for weeks. Install the app to the home screen and keep backups.
- AI photo analysis, the physique scan and conversational coaching haven't been exercised against the live API in this build environment, which had no API key. Request shapes are type-checked against the SDK and the schemas are verified to convert.
