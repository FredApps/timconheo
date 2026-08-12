# Tìm Con Heo

A calm Vietnamese reading app for beginners, with an ear pointed toward Đà Nẵng and Quảng Nam. It is English-primary and bilingual by default, and it would rather tell you a reading is hard than hide that from you.

Live at [ayrien.se/heo](https://ayrien.se/heo/).

## What it does

- Read twelve annotated readings — the alphabet and tone primer, folk rhymes and verse, and two everyday scenes set in Đà Nẵng and Hội An — with full, guided, or plain-text scaffolding.
- Tap any word for its meaning, its part of speech, its classifier or Sino-Vietnamese root, and any Central note that applies. Every word in every shipped reading has a real dictionary entry.
- Sort an open library by what suits you next, by intrinsic difficulty, or by length. Every estimate shows its inputs and admits when it has nothing to go on.
- Practise the five Central tone contours with microphone pitch feedback, plus a real five-choice listening check.
- Save words and your own pasted texts, then review them in server-side FSRS inside a time-boxed session that ends on the clock.
- Read the interface in English, Vietnamese, or both at once.
- Run the same Vite/React client in the Android Capacitor shell.

Nothing here has streaks, hearts, XP, or a daily guilt counter. The garden only grows.

## Architecture

v0.7 is offline-first after the first authenticated load. IndexedDB holds the account snapshot and an operation outbox; `/api/sync` applies UUID-keyed operations exactly once and returns a monotonic cursor. The service worker caches only public application assets—account data never enters Cache Storage. Android bundles the same assets, uses native HTTP for the remote API, and encrypts its revocable bearer session with an Android Keystore AES-GCM key. Browser sessions remain secure HTTP-only cookies.

The browser or Android WebView talks to an Express server backed by SQLite; IIS reverse-proxies `/heo` to the Node process. The server owns anything two devices must agree about — sessions, words, progress, cards, queue packing, review scheduling and speech generation. The client owns presentation, difficulty estimates, pitch capture, device-voice fallback and local preferences.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full picture, including the scheduling and speech-fallback rules.

## Local configuration and secrets

Runtime configuration lives in `.env`, which is ignored by Git. Copy the example and set a unique initial password before first start:

```powershell
Copy-Item .env.example .env
notepad .env
```

`HEO_SEED_PASSWORD` is needed only when the database has no users. The FPT.AI key is read from the file named by `HEO_FPT_KEY_FILE` and must live outside this repository. Keep deployment credentials, Android signing files and `local.properties` under the local secrets directory, never in a commit.

## Develop and verify

Requires Node.js 22.13 or newer.

```powershell
npm install
npm run dev
```

Before pushing:

```powershell
npm run format:check
npm run typecheck
npm test
npm run lint
npm run build
npm run audit:prod
node scripts/scan-secrets.mjs
```

`npm test` runs both halves: server tests under `node --test` against real SQLite in temporary databases, and client tests under Vitest with jsdom, Testing Library and axe. They cover validation bounds, rate-limit pruning, backup and restore, scheduler packing and forgiveness, honest learner statistics, difficulty determinism, import segmentation, speech polling and fallback timing, reader and review behaviour, source-line integrity, and an accessibility pass over every screen.

CI runs on AnayPC rather than GitHub Actions — see [AGENTS.md](AGENTS.md).

## Deploy

Production is deployed only from AnayPC with `scripts/install-server.ps1`. The installer backs up SQLite, builds a commit-addressed release under `C:\ProgramData\TimConHeo\releases`, switches the `current` junction, registers SYSTEM startup and health-watch tasks, verifies `/api/health`, and restores the prior junction if verification fails. See `ARCHITECTURE.md` for recovery details.

Run deployment from the AnayPC environment:

```powershell
npm run backup
.\scripts\install-server.ps1
```

The installer publishes to `C:\ProgramData\TimConHeo\app`, installs dependencies, builds client and server, records the deployed commit in `.env`, restarts the supervisor and configures the IIS reverse proxy. Runtime data, backups and the audio cache stay outside the Git checkout.

Confirm the deployment with `/heo/api/health`, which reports both the version and the commit actually running.

Optionally warm the Central-voice cache for the shipped corpus so the first play is instant:

```powershell
npm run precache -- --dry-run   # report what is missing
npm run precache                # generate it
```

## Android

```powershell
.\scripts\release-android.ps1            # debug
.\scripts\release-android.ps1 -Release   # signed release
```

Android signing configuration belongs in the local secrets directory and must not be committed.

## Data and privacy

Imported text is stored with your account on this server and is never redistributed. When you press play, that text is sent to FPT.AI to generate audio; nothing is sent before you press play.

Playback uses FPT.AI's generic Central Vietnamese **My An** and **Gia Huy** voices. They are synthetic voices labelled Central — not studio recordings of Đà Nẵng speakers — and the app does not claim otherwise. If FPT is slow, unavailable or out of quota, playback falls back to your device's own `vi-VN` voice, which is usually Northern, and the badge changes to say so rather than continuing to claim a Central voice.

Source variants and attribution decisions are recorded in [CONTENT_SOURCES.md](CONTENT_SOURCES.md), and the rendered lines are locked against regressions by the corpus test.

## Contributing and license

See [CONTRIBUTORS.md](CONTRIBUTORS.md). Keep secrets and build output out of commits, run the verification commands above before pushing, and record user-facing changes in [CHANGELOG.md](CHANGELOG.md).

Tìm Con Heo is licensed under the GNU General Public License v3.0-only. See [LICENSE](LICENSE).
