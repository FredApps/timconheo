# Tìm Con Heo

Tìm Con Heo is a calm, local-first Vietnamese reading app for an absolute beginner. It exposes Vietnamese word boundaries, glosses, Central-dialect notes, and tone contours while keeping authentic text intact.

The current app includes:

- five public-domain nursery-rhyme readings with phrase-level segmentation;
- three scaffolding levels: **Đầy đủ**, **Vừa**, and **Trần**;
- tappable dictionary sheets with classifier, reduplication, pronoun, Hán–Việt, and Đà Nẵng notes;
- system Vietnamese speech with an explicit source/accent label;
- a five-tone Đà Nẵng lab with microphone pitch capture and shape-based feedback;
- device-local words, FSRS cards, reading completion, and imports via IndexedDB/local storage;
- time-boxed review sessions and a cumulative, never-wilting vocabulary garden;
- light/dark themes, mobile bottom navigation, self-hosted Vietnamese fonts, and offline runtime caching.

## Run locally

Requires Node.js 22.13 or newer.

```powershell
npm install
npm run dev
```

The local development address is printed in the terminal (normally `http://localhost:3000`).

## Verify

```powershell
npm run lint
npm test
npm audit
```

`npm test` performs a production build and server-render smoke tests.

## Data and privacy

There are no accounts or server-side user records. Saved words, review cards, progress, and pasted imports remain in browser storage on the current device. Imported copyrighted text is never sent to an application server.

Bundled sample readings are public-domain oral-tradition material. Audio played in the web build uses the device's `vi-VN` system voice and is deliberately labeled as such; it is not represented as a Đà Nẵng voice.

## Main files

- `app/App.tsx` — product flows and interactions
- `app/data.ts` — annotated sample corpus
- `app/globals.css` — visual system and responsive layouts
- `app/lib/database.ts` — Dexie persistence and FSRS scheduling
- `app/lib/pitch.ts` — microphone pitch detection and tone feedback
- `public/sw.js` — offline runtime cache
- `android/` — Capacitor Android application with bundled offline assets
- `deploy/` — IIS-safe web deployment files

## Android

The native project uses Capacitor and includes the web bundle inside the APK. Native Vietnamese TTS and speech-recognition plugins are installed; the web microphone contour lab remains available inside the WebView.

```powershell
npm run build:android
cd android
.\gradlew.bat assembleDebug --no-daemon
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
