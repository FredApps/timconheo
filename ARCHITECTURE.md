# Architecture

## Offline and synchronization

The web and Android clients keep a versioned IndexedDB snapshot plus a durable outbox. Mutations are optimistic locally and replay through `POST /heo/api/sync`; `operationId` makes application exactly-once and the server sequence is the pull cursor. Progress is a set union, completion is monotonic, import deletion leaves a tombstone, tone attempts are append-only, and explicit word status uses accepted operation order. Review events carry occurrence time and are reconciled back to canonical FSRS state. Cache Storage contains only the public shell and immutable assets.

Browsers authenticate with secure HTTP-only cookies. Android requests a separate revocable bearer session during login; the custom `SecureSession` Capacitor plugin encrypts that token with a non-exportable Android Keystore AES-GCM key before storing the ciphertext in private preferences. Logout revokes the server session and clears the local ciphertext.

## Production lifecycle

`install-server.ps1` creates commit-addressed releases and atomically switches `C:\ProgramData\TimConHeo\current`. `TimConHeoServer` runs as SYSTEM at boot with Task Scheduler restart policy. `TimConHeoHealthWatch` probes database-backed health every five minutes and restarts after three consecutive failures. A pre-deploy SQLite snapshot and the previous junction are retained until the new commit passes local health verification; failure switches the prior release back. Logs rotate at 5 MB and expire after 30 days.

As built in v0.6.0. The original design brief, written before any of this existed, is archived at [docs/archive/design-brief.md](docs/archive/design-brief.md) — it is useful product context and is no longer an accurate description of the code.

## Shape

```text
browser / Android WebView
        |
        v
IIS reverse proxy   ^heo(/.*)$ -> http://127.0.0.1:3092/heo{R:1}
        |
        v
Express 5 + built SPA          (supervisor: scripts/start-server.ps1)
        |
        +--> SQLite   C:\ProgramData\TimConHeo\timconheo.sqlite3
        +--> mp3 cache C:\ProgramData\TimConHeo\tts-cache
        +--> FPT.AI   https://api.fpt.ai/hmi/tts/v5   (server-side only)
```

`/heo` must not be a child IIS application; it would shadow the rewrite rule.

## Who owns what

The split is deliberate: anything a second device must agree about lives on the server.

**Server** — sessions, accounts, the word list, reading progress, FSRS cards, queue packing, backlog forgiveness, speech generation, and the API key. The clock that decides what is due is the server's, because device time is not trustworthy and a user changing their date should not conjure a review session.

**Client** — presentation, language mode, theme, reader text size, difficulty estimates, microphone pitch capture, and device-voice fallback. Difficulty is computed client-side because the server has no copy of the corpus and giving it one would duplicate the content.

## Client modules

| Path              | Responsibility                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/Root.tsx`    | Session phase: loading, offline, signed out, signed in. Hosts the only `LangProvider` and `SpeechProvider`.                                |
| `app/App.tsx`     | Shell: routing on the hash, learner state, toasts.                                                                                         |
| `app/views/`      | One file per view. `reader/`, `tones/` and `shared/` hold their sub-components. `index.ts` is a barrel and defines nothing.                |
| `app/components/` | Chrome and feedback primitives (`AsyncButton`, `ErrorNote`, `Spinner`, `ConnectionScreen`).                                                |
| `app/i18n/`       | `strings.ts` is the closed catalogue; `content.ts` labels the closed content enums; `index.tsx` provides `t()`, `<T/>` and `<BiText/>`.    |
| `app/data/`       | The corpus. `stories/` by kind, plus `lexicon.ts`, `tones.ts`, `alphabet.ts`, `compounds.ts`, `freq-core.json`. `app/data.ts` is a barrel. |
| `app/lib/`        | `api.ts`, `speech.tsx`, `speech-control.ts`, `difficulty.ts`, `stats.ts`, `imports.ts`, `pitch.ts`, `async.ts`, `focus.ts`, `hash.ts`.     |

`app/lib/api.ts` distinguishes `ApiError` from `NetworkError`, because a 401 means sign in again and a dropped connection does not. Conflating them is how an app throws someone out of a session over a lift ride.

## Language

English is primary; Vietnamese is shown beneath it in bilingual mode. The mode lives in `localStorage` rather than on the server: the sign-in screen and the loading splash both render before any authenticated call resolves, so a server-stored preference would flash the wrong language on every cold start — on exactly the screen where someone with no Vietnamese is most stuck.

`<T/>` renders the secondary line `aria-hidden`. Without that, every control announces itself twice, in two languages.

A test scans `app/views/`, `app/components/` and the three root components for Vietnamese diacritics outside the catalogue. Vietnamese that a component hard-codes is Vietnamese the language setting cannot turn off.

## Scheduling

`GET /heo/api/cards/queue?minutes=N` is the only path that reads cards; `/api/state` deliberately does not return them. The endpoint needs a trusted clock, it performs writes (forgiveness, exactly once), and the new-card quota is per-user state — none of which survive being done client-side.

- `server/scheduler.ts` ranks by **relative** overdueness, so a one-day card a day late outranks a six-month card a week late.
- Packing is by time cost (~9s review, ~14s new), with new cards interleaved so a session never front-loads unfamiliar words.
- After 14 idle days, overdue cards are spread across 21 days weighted by FSRS stability, once, guarded by a flag in `users.settings_json`. `updated_at` is preserved, or the overdueness signal it just rescheduled around would be destroyed.
- The session ends on the **clock**. No card count is shown anywhere, including debug output.
- Promotion to `known` is monotonic. A lapse reopens scheduling but never uproots a garden plant; only an explicit choice in the word list demotes.

## Speech

`server/tts.ts` is a content-addressed cache in front of FPT.AI: `sha256(voice, speed, text)` names the mp3, jobs coalesce, failures back off, and the cache is pruned by age and total size. The API key is read from a file outside the repository and never reaches the client.

The client state machine (`app/lib/speech-control.ts`) is the part that matters to a learner:

| Elapsed | Behaviour                                                                |
| ------- | ------------------------------------------------------------------------ |
| 0s      | `generating` — badge reads "Preparing My An…"                            |
| 5s      | "Use device voice now" appears                                           |
| 12s     | Automatic fallback to the device `vi-VN` voice                           |
| any     | A terminal server error (quota, no key, busy) falls back **immediately** |

Once fallback happens the badge says **Device Vietnamese** and stops claiming a Central voice. A device `vi-VN` voice is almost always Northern, and this app is built on the claim that the difference matters.

`speak()` returns a promise that rejects with a cancellation when `stop()` runs, so an ordered "listen to all" loop stops instead of racing ahead a line.

`npm run precache` warms the shipped corpus. Nothing a user typed reaches FPT without them pressing play.

## Content

Every reading carries kind, region, licence, source URL and, for original Central-set material, an `attributionNote` stating plainly that it is standard Vietnamese written for learners rather than a transcription of regional speech. `tests/client/corpus.test.ts` locks the sourced lines character-for-character, checks NFC normalisation, checks id uniqueness, and requires every word in every shipped reading to have a real dictionary entry.

Difficulty weights are frozen reference values, not statistics fitted to this corpus. Fitting them would mean adding one reading silently re-scored every existing one.

Where a learner has tracked no words, unfamiliarity is reported as **not measured yet** rather than as a percentage. The previous version blended toward an invented 18% baseline; a number the app cannot defend is worse than no number.

## Verification

```powershell
npm run format:check
npm run typecheck
npm run test:server     # node --test, real SQLite, temporary databases
npm run test:client     # vitest + jsdom + testing-library + axe
npm run lint
npm run build
npm run audit:prod
node scripts/scan-secrets.mjs
```

Then `.\scripts\install-server.ps1`, and check `/heo/api/health` reports the version **and the commit** you just deployed.

Run `npm run backup` before deploying. It uses `VACUUM INTO`, which takes a read transaction and is therefore safe against the live database — a file copy of a WAL database is not — then verifies the result by reopening it and comparing row counts.

CI runs on AnayPC, not GitHub Actions. See [AGENTS.md](AGENTS.md).
