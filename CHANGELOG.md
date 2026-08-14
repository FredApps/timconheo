# Changelog

## 0.7.1 — 2026-08-14

- Added `HEO_AUTO_LOGIN_USER`: when set, every request without a session is signed in as that account automatically, with no login page. Off by default, opt-in via `.env`, logged loudly on every start while active. See "Auto-login" in [ARCHITECTURE.md](ARCHITECTURE.md) before turning it on anywhere reachable from outside a trusted network.
- Renamed the server entry point and its supervisor script from `server.js`/`start-server.ps1` to `heo-server.js`/`start-heo-server.ps1`, so a process or scheduled-task list no longer reads identically to the sibling `listen` and `watch` services on the same host.
- Fixed a supervisor bug that crash-looped the server the moment it wrote anything to stderr: Windows PowerShell turns a native child's stderr line into a terminating error under `$ErrorActionPreference = "Stop"`, which was already true of the existing 500-error logging and became visible the moment a startup line used `console.warn`. `start-heo-server.ps1` now scopes `Continue` around the child process call.
- Fixed `install-server.ps1`'s release-junction handling, which could hit a confirmation prompt that hangs a non-interactive deploy, or (with `-Recurse`) delete a release's real content instead of just unlinking the pointer to it. Junction removal now goes through `[System.IO.Directory]::Delete`, and the post-deploy health check window was widened from 20s to 60s to match how long a cold start after `npm ci` actually takes.

## 0.7.0 — 2026-08-12

- Added a versioned IndexedDB mirror and durable operation outbox so signed-in learners can read, import, review, update words, complete readings and practise tones offline.
- Added the idempotent sync protocol, deterministic progress/word/import/tone conflict rules, import tombstones, stable entity UUIDs and canonical server cursors.
- Bundled Android assets for cold offline startup and added explicit service-worker update prompts and visible offline/sync health.
- Added data export, bulk import deletion, account deletion, session revocation, device purge, import-storage disclosure and versioned cloud-speech consent.
- Expanded the corpus to 50 readings and 160 sentences, removed the final rights-reserved excerpt, and added grammar/cultural notes plus four review card kinds.
- Added a warmer Hội An and pig-themed resilience layer, accessible privacy controls and reduced-motion-safe status animation.
- Replaced the Run-key supervisor with SYSTEM Scheduled Tasks, crash restart, a health watchdog, structured bounded logs, 30-backup retention and atomic versioned releases with rollback.
- Added sync/tombstone tests and Playwright coverage for offline cold reload and privacy controls.

## 0.6.0 — 2026-08-04

### Honest numbers

- Counted syllables read from the actual text instead of counting sentence identifiers, which reported a nine-line rhyme as nine syllables. A sentence read twice now counts once.
- Replaced the invented 18% familiarity baseline with an explicit "not measured yet" until you have tracked some words, and labelled reading days, finished readings and rooted words for what they each are.
- Removed the Hán-Việt density signal from the difficulty model. It counted diacritics, which is not what Hán-Việt is.

### Reading

- Grew the corpus from eight readings to twelve, and from 28 sentences to 46: _Bầu ơi thương lấy bí cùng_ and the six-line _Trâu ơi ta bảo trâu này_ from SCOV, plus two original everyday scenes set on the Hàn river and in Hội An market.
- Described the original Central-set readings on the page as standard Vietnamese learning material, not as transcriptions of regional speech.
- Raised shipped vocabulary coverage to 100%: every word in every reading now has a real entry with part of speech, and where it earns one, a classifier note, a Sino-Vietnamese root or a Central note. Tier 0 letters and tone marks explain themselves instead of reading "a word from the text".
- Fixed repeated words such as "bé bé" rendering only once, and made finishing a reading wait for the save before leaving the page.
- Resolved review context for cards saved from your own imported texts, client-side, with no database migration.

### Speech

- Rebuilt playback around an explicit state machine. The badge shows "Preparing My An…" while audio is generated, offers the device voice after five seconds, falls back automatically after twelve, and falls back immediately when the server reports a quota or configuration error.
- Once playback falls back, the badge reads "Device Vietnamese" instead of continuing to claim a Central voice.
- Made cancellation reliable, so stopping "listen to all" no longer advances to the next line.
- Added `npm run precache` to warm the Central voices for the shipped corpus. Nothing you type is sent to FPT before you press play.

### Reading it at all

- Raised supporting text to at least 12px and interface text to 14–16px, and gave every control a 44px touch target.
- Made the word panel a real dialog on narrow screens: labelled, focus-contained, dismissed by Escape or an outside click, and it returns focus to the word you tapped.
- Added `aria-current`, `aria-pressed`, progress semantics, translated ARIA labels and a text description of the tone chart. Fixed four defects axe found: `role="dialog"` on `<aside>`, `role="img"` on `<section>`, duplicate navigation landmarks and a stray heading level in the word list.
- Gave every asynchronous action a busy, success and recoverable error state, and replaced the loading splash with a retryable connection screen when the server cannot be reached — losing the network is not being signed out.
- Removed the nested language provider, so one setting now controls the sign-in screen and the app alike.

### Words and imports

- Translated the word filters, added an "ignored" filter, added sorting by recency, alphabet or times seen, and showed the shipped bilingual gloss for words saved before the dictionary knew them.
- Enforced the 120-character title and 20,000-character text limits with a live counter, replaced longest-match segmentation for compounds such as "buổi sáng", split imports into sentences, and put an inline confirmation on delete.

### Under the surface

- Added `shared/validation.ts` as one bounded contract for entries, glosses, identifiers, progress arrays, imports, tone enums, scores and route parameters, returning structured `400` responses.
- Added security headers and a compatible Content-Security-Policy, opportunistic rate-limiter pruning, and a 500-attempt cap per user on tone practice history.
- Added `npm run backup`: a `VACUUM INTO` snapshot that is safe against the live database, verified by reopening it and comparing row counts, retaining fourteen.
- `/api/health` now reports the version and the deployed commit.
- Split the compressed view, component, story and translation files into readable modules; barrels export only. Added Prettier, type-aware ESLint with React Hooks and unused-code rules, and a secret scanner covering the working tree, build artifacts and history.
- Grew the test suite to 124: server tests under `node --test` against real SQLite, client tests under Vitest with jsdom, Testing Library and axe.
- Replaced the superseded design proposal with [ARCHITECTURE.md](ARCHITECTURE.md) and archived the original brief under `docs/archive/`.

## 0.5.0 — 2026-08-03

- Made the product English-primary with bilingual, English-only, and Vietnamese-first modes persisted as `tch-lang`.
- Split the app into views and components, added the open Library and five-item bottom navigation, and moved Garden to overflow navigation.
- Added transparent static difficulty bands, frequency provenance, personal unknown-word estimates, tier 0 material, and additional Quảng Nam / folk-verse corpus entries.
- Added a server-side due-card queue with daily new-card caps, relative-overdueness packing, real-clock review sessions, forgiveness after long inactivity, and FSRS short-term learning.
- Reworked tone feedback around normalized full pitch contours, silence detection, and a real five-choice exercise while preserving the mả/mã demonstration.
- Added regression tests, architecture documentation, bilingual metadata, and GPLv3 contributor/project documentation.
- Corrected truncated source lines across the shipped readings, restored the complete selected folk variants, and fixed attribution for _Mẹ yêu không nào_.

## 0.4.0 — 2026-08-02

- Prepared the repository for public collaboration with a README, contributor guidance, GPLv3-only licensing, metadata, and local-secret separation.
