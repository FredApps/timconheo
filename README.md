# Tim Con Heo

A calm Vietnamese reading app for beginners, with an ear pointed at Da Nang
and Quang Nam. It exposes Vietnamese word boundaries, glosses, Central-dialect
notes, and tone contours while leaving authentic text intact.

Live at **https://ayrien.se/heo/**

## What it does

- Read annotated Vietnamese stories with three scaffolding levels.
- Track vocabulary locally to each account and review it with FSRS scheduling.
- Import and save personal reading material.
- Practice the five tones with microphone pitch contours and feedback.
- Use the responsive web app or the Android Capacitor shell.

## Architecture

The project is a Vite/React client with an Express server and SQLite-backed
account data. In production, IIS reverse-proxies /heo to the Node process.

~~~text
browser / Android WebView
        |
        | https://ayrien.se/heo/
        v
IIS reverse proxy
        |
        v
Express (dist/server/server.js)
  /heo/api/*        JSON API and session-cookie auth
  /heo/download/*   APK downloads
  /heo/*            built SPA
        |
        v
SQLite: C:\ProgramData\TimConHeo\timconheo.sqlite3
~~~

The client uses React 19 and Vite with base /heo/. The server uses Express 5
and ts-fsrs; passwords are scrypt-hashed and session tokens are stored as
SHA-256 hashes in httpOnly, Secure, SameSite=Lax cookies.

## Local configuration and secrets

Runtime configuration is loaded from .env, which is intentionally ignored by
Git. Copy the example and set a unique initial password before the first start:

~~~powershell
Copy-Item .env.example .env
notepad .env
~~~

HEO_SEED_PASSWORD is required only when the database has no users. It is not
needed after the first account has been created. Keep deployment credentials,
Android signing files, local.properties, and other machine-specific secrets
under the local secrets directory rather than in this repository.

## Develop

Requires Node.js 22.13 or newer.

~~~powershell
npm install
npm run dev
~~~

Vite serves the client on port 5173 and proxies /heo/api to the server on
port 3092.

## Verify

~~~powershell
npm run typecheck
npm run lint
npm test
~~~

## Accounts

Signups are closed by default after the first account exists. Use the admin
CLI on the server to manage accounts:

~~~powershell
npm run admin -- list
npm run admin -- add <username> <password>
npm run admin -- passwd <username> <password>
~~~

## Deploy

Run deployment from the AnayPC environment:

~~~powershell
.\scripts\install-server.ps1
~~~

The installer publishes the app to C:\ProgramData\TimConHeo\app, installs
dependencies, builds the client and server, restarts the supervisor, and adds
the IIS reverse-proxy rule. Runtime data and logs stay under
C:\ProgramData\TimConHeo and are never part of the Git checkout.

## Android

~~~powershell
.\scripts\release-android.ps1            # debug
.\scripts\release-android.ps1 -Release   # signed release
~~~

The APK is a Capacitor shell pointed at https://ayrien.se/heo/; learning state
remains on the server. Android signing configuration belongs in the local
secrets directory and must not be committed.

## Data and privacy

Imported text is stored with the signed-in account on this server and is not
sent to a third party by the application. Bundled readings are public-domain
oral-tradition material. Audio uses the device's vi-VN system voice and is not
presented as a Da Nang voice recording.

## Main files

- app/Root.tsx — session gate and login screen
- app/App.tsx — product flows and interactions
- app/data.ts — annotated sample corpus
- app/lib/api.ts — typed API client
- app/lib/pitch.ts — microphone pitch detection and tone feedback
- server/server.ts — routes and static serving
- server/auth.ts — password hashing, sessions, and rate limiting
- server/database.ts — SQLite schema and per-user queries
- scripts/install-server.ps1 — deployment

## Contributing

See CONTRIBUTORS.md. Keep secrets and generated build outputs out of commits,
run the verification commands before pushing, and document user-facing changes
in CHANGELOG.md.

## License

Tim Con Heo is licensed under the GNU General Public License v3.0-only. See
LICENSE for the full text.
