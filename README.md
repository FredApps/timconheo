# Tìm Con Heo

A calm Vietnamese reading app for beginners, with an ear pointed toward Đà Nẵng and Quảng Nam. v0.5.0 is English-primary, bilingual by default, and keeps difficulty honest rather than hiding hard text.

Live at [ayrien.se/heo](https://ayrien.se/heo/).

## What it does

- Read annotated Vietnamese stories with full, guided, and plain-text scaffolding.
- Sort an open library by static difficulty or personal i+1 readiness; every estimate exposes unseen words and its limits.
- Practice Central tone contours with microphone pitch feedback and a real five-choice check.
- Save words and personal imports, then review them in server-side FSRS with a time-boxed queue.
- Use English, Vietnamese, or bilingual UI text from the language menu.
- Run the same Vite/React web client in the Android Capacitor shell.

## Architecture

The browser or Android WebView talks to an Express server backed by SQLite. IIS reverse-proxies `/heo` to the Node process. The client owns presentation, speech, pitch capture, difficulty estimates, and local language preference; the server owns sessions, words, progress, cards, queue packing, and review scheduling.

```text
browser / Android WebView
        |
        v
IIS reverse proxy (/heo)
        |
        v
Express API + built SPA
        |
        v
SQLite: C:\ProgramData\TimConHeo\timconheo.sqlite3
```

## Local configuration and secrets

Runtime configuration lives in `.env`, which is ignored by Git. Copy the example and set a unique initial password before first start:

```powershell
Copy-Item .env.example .env
notepad .env
```

`HEO_SEED_PASSWORD` is needed only when the database has no users. Keep deployment credentials, Android signing files, `local.properties`, and other machine-specific secrets under the local secrets directory, never in this repository.

## Develop and verify

Requires Node.js 22.13 or newer.

```powershell
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

The test suite covers scheduler packing and forgiveness, bilingual catalog parity and UI-language leakage, and deterministic difficulty ranking.

## Deploy

Run deployment from the AnayPC environment:

```powershell
.\scripts\install-server.ps1
```

The installer publishes the app to `C:\ProgramData\TimConHeo\app`, installs dependencies, builds the client and server, restarts the supervisor, and configures the IIS reverse proxy. Runtime data and logs remain outside the Git checkout.

## Android

```powershell
.\scripts\release-android.ps1            # debug
.\scripts\release-android.ps1 -Release   # signed release
```

Android signing configuration belongs in the local secrets directory and must not be committed.

## Data and privacy

Imported text is stored with the signed-in account on this server and is not sent to a third party by the application. Bundled readings include source and licence metadata. Audio uses the device's `vi-VN` system voice and is not presented as a studio Đà Nẵng recording.

The selected traditional-text variants and attribution decisions are recorded in [CONTENT_SOURCES.md](CONTENT_SOURCES.md). Rendered source lines are protected against missing-token regressions by the corpus test.

## Contributing and license

See [CONTRIBUTORS.md](CONTRIBUTORS.md). Keep secrets and generated build output out of commits, run the verification commands before pushing, and document user-facing changes in [CHANGELOG.md](CHANGELOG.md).

Tìm Con Heo is licensed under the GNU General Public License v3.0-only. See [LICENSE](LICENSE).
