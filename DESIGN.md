# Architecture as built in v0.5.0

This section records the implementation that exists in the repository. The earlier design brief below remains useful as product context, but its original single-user/no-account assumptions are superseded by the current account-backed architecture.

## Runtime boundaries

- `app/` is a Vite/React client. `App.tsx` is the shell; `app/views/` contains Home, Library, Reader, Review, Tones, Words, Garden, Import, and About views; `app/i18n/` owns language mode and bilingual labels.
- `app/data.ts` contains the shipped tier 0–2 corpus and tone metadata. `app/lib/difficulty.ts` computes static and personal estimates client-side; `app/lib/pitch.ts` handles pitch normalization and contour scoring.
- `server/` is an Express 5 API. `server/database.ts` is the SQLite boundary, `server/scheduler.ts` packs due/new cards, and `server/server.ts` applies FSRS scheduling and authentication.
- `/api/state` returns words, progress, imports, and tone attempts. Cards are intentionally absent; `/api/cards/queue?minutes=N` is the only queue read path.

## Persistence and scheduling

Cards are server-owned and keyed to source sentences. Review time is a client-side wall-clock box around a server-created queue. New-card limits and forgiveness metadata are persisted in `users.settings_json`; the settings column is guarded by a startup migration for older databases. Known status is monotonic, while FSRS state remains authoritative for due dates.

## Content and honesty

Every story has kind, region, licence, source, and difficulty-band metadata. Difficulty is an estimate, not a gate: the Library remains open, shows unseen-token ratios, and exposes static inputs and frequency provenance. UI copy is translated through `T`/`BiText`; content translations and word glosses are separate from interface strings.

## Verification boundary

The supported remote workflow is `typecheck → test → build → install-server.ps1`. After deployment, verify `/heo/`, the public API health response, login, queue creation, review rating, language persistence, tone recording permissions, and mobile layout on a real device.

---

# Tìm Con Heo — Design & Implementation Plan

> A Vietnamese learning app for one absolute beginner, taught in the Đà Nẵng / Quảng Nam dialect,
> built around reading real Vietnamese.

---

## 1. Context

There is no Satori Reader for Vietnamese. The graded-reading apps that exist (FluencyDrop, Vmonkey,
Reading A-Z) are either kids' content, uncontrolled difficulty, or thin wrappers on a wordlist. None
teach Central dialect — every commercial product ships Hanoi or Saigon and nothing else.

**Tìm Con Heo** ("find the pig" — and note the name is itself the first lesson: `con` is the animate
classifier, `heo` is the Central/Southern word for pig where Hanoi says `lợn`) is a single-user app to
learn Vietnamese by reading real Vietnamese, with the Đà Nẵng dialect as the pronunciation target.

Four decisions are fixed and shape everything below:

| Decision   | Value                                                         |
| ---------- | ------------------------------------------------------------- |
| Stack      | Static PWA on IIS + native Android app, one web codebase      |
| Dialect    | Central / Đà Nẵng (South-Central)                             |
| Audience   | Absolute beginner, single user, no accounts                   |
| Content    | Imported real Vietnamese material                             |
| Constraint | Free APIs only for pronunciation; must not feel like Duolingo |

### The thesis

**Tìm Con Heo is an annotation engine, not a content producer.** It takes Vietnamese written by
Vietnamese people and makes it legible to a beginner by exposing word boundaries, glosses, Hán-Việt
morphology, and Central pronunciation. Every hard tension in the brief resolves from that framing.

---

## 2. The core tension, and how it resolves

"Absolute beginner" and "import real material" appear to contradict — authentic Vietnamese is far too
hard for someone starting at zero. The contradiction is an artifact of assuming _authentic_ means
_modern prose_. It doesn't. Three levers dissolve it.

### Lever A — authentically easy registers exist

Five tiers (**Thang**, "the ladder"). Every tier is real material; none is authored.

| Tier | Name                           | Source                                                                                     | Why a beginner can read it                                                                                                |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 0    | **Chữ & Thanh**                | Hand-authored _meta_-content + Common Voice clips                                          | A course _about_ the writing and tone system. Not fake Vietnamese. ~2–3h. The only hand-written part, legitimately so.    |
| 1    | **Đồng dao** (nursery rhymes)  | Oral tradition, public domain                                                              | 4–6 syllables a line, heavy repetition, concrete nouns, and rhythm — which scaffolds tone. A genuinely beginner register. |
| 2    | **Ca dao / tục ngữ** + Tatoeba | Folk verse (PD), incl. a Quảng Nam sub-corpus; Tatoeba vi (CC-BY) filtered to ≤8 syllables | Ca dao introduces _mô/tê/răng/rứa_ naturally. Tatoeba is modern spoken register with translations already attached.       |
| 3    | **Truyện cổ tích**             | vi.wikisource (CC-BY-SA)                                                                   | Narrative, repetitive story grammar, 200–600 words.                                                                       |
| 4    | **Personal imports**           | VnExpress, Báo Đà Nẵng, VOV Miền Trung, lyrics                                             | Device-local only. See §10.                                                                                               |

Tier 1 is the crown jewel: đồng dao is authentic, free, public domain, short, and full of
`con cò` / `con mèo` / `con heo` — exactly the classifier lesson the app name encodes.

### Lever B — the difficulty knob is scaffolding density, not text simplification

The **same reader renders every tier**. What changes is annotation density — a three-position control:

- **Đầy đủ (full)** — every word boxed with visible segmentation, unknown words tinted, inline gloss
  under each phrase, English shown, audio highlights the current sentence.
- **Vừa (assisted)** — segmentation on tap only; translation collapsed per sentence.
- **Trần (raw)** — plain standard orthography, no boxes; tap still works.

So a beginner _can_ open a news article on day one. The app doesn't hide the difficulty — it measures
it, says so ("87% of the words here are new to you"), and gives maximum scaffolding.

### Lever C — the personalised i+1 sort

The only difficulty number that matters is `unknownRatio` against _this user's_ known-set. The home
screen's **Sẵn sàng** ("ready for you") list sorts everything available by `|unknownRatio − 0.06|`,
targeting the ~94–95% known-word comprehension threshold from reading research. Static grades order
the library; the personal ratio orders the queue.

---

## 3. Automatic difficulty grading

Computed identically at build time (Python) and import time (TypeScript) from one shared spec.
**Deliberately not ML** — no training data exists, and an unexplainable score is useless here. A
hand-weighted linear model, with the breakdown shown in the UI.

Features: `meanSentenceSyllables`; frequency coverage against the `wordfreq` Vietnamese list (shipped
as `freq.json` so JS computes the same thing); type-token ratio; **`hvDensity`** — the fraction of
tokens whose syllables are all Hán-Việt, which is the single best formality predictor in Vietnamese
(news is HV-saturated, đồng dao is nearly HV-free); clause-linker counts (`mà/nhưng/tuy/vì/nên/khi/nếu/bị/được`);
proper-noun and numeral ratios.

```
raw = 0.30*z(meanSentenceSyllables) + 0.28*(1 - top2kCoverage) + 0.22*z(hvDensity)
    + 0.10*z(ttr) + 0.06*z(clauseLinkers) + 0.04*z(properNounRatio)
score = clamp(round(1 + 9*sigmoid(raw)), 1, 10)
```

Weights live once in `pipeline/src/tch/grade.py`, mirrored in `web/src/lib/import/grade.ts`, with a
golden-file test asserting both produce identical scores on a fixture set.

---

## 4. Stack

| Concern        | Decision                                               | Why                                                                                                                                                                       |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | **SvelteKit 2 / Svelte 5, `adapter-static`, TS, Vite** | Compile-time framework, tiny runtime — matters when a page renders 2,000 individually-tappable spans. Static output robocopies to IIS and drops into Capacitor unchanged. |
| Local DB       | **Dexie (IndexedDB)**                                  | localStorage's 5MB synchronous string-only cap is disqualifying. Dexie gives real types and migrations.                                                                   |
| SRS            | **ts-fsrs**                                            | MIT, current SOTA. Store the full FSRS card object; don't reimplement scheduling.                                                                                         |
| Dictionary     | **Sharded static JSON + index**                        | Not SQLite-WASM — multi-MB wasm for read-only lookup. Shards cache in the SW and give faster first-lookup.                                                                |
| Service worker | **`vite-plugin-pwa`** (Workbox)                        | Precache shell only; corpus is runtime-cached with explicit user-initiated downloads.                                                                                     |
| Android        | **Capacitor**                                          | See §7.                                                                                                                                                                   |
| Pipeline       | **Python 3.12 via `uv`**                               | ⚠️ System Python is **3.14** — `underthesea` will not have wheels. Pin 3.12 in `pyproject.toml`; `uv` fetches the interpreter.                                            |
| Deploy         | **`deploy/push.ps1`** modelled on `WatchTalk\push.ps1` | Reuses conventions that already work on this box.                                                                                                                         |

**Verified toolchain:** Node 26.1.0, npm 11.14.1, git 2.54.0, Python 3.14.5, and
`OneDrive\Projects\.tools\` already holds `jdk`, `gradle`, `android-sdk`, and `ffmpeg`.

### The single most important architectural decision

All content access goes through one interface, so nothing above it knows which target it runs on.
This is what keeps "one web codebase" honest across PWA and APK.

```ts
interface ContentSource {
  manifest(): Promise<Manifest>;
  story(id: string): Promise<Story>;
  dictShard(key: string): Promise<Record<string, DictEntry>>;
  audioUrl(ref: AudioRef): Promise<string>; // blob: | capacitor:// | /heo/audio/...
  isAvailableOffline(id: string): Promise<boolean>;
  download(id: string, onProgress: (p: number) => void): Promise<void>;
}
```

- `WebContentSource` — `fetch` + Workbox caches.
- `NativeContentSource` — Capacitor `Filesystem`, reading bundled APK assets with an OTA-downloaded
  overlay directory that shadows them.

SvelteKit bakes `paths.base` at build time and the targets differ, so two build scripts:
`build:web` → `BASE_PATH=/heo`; `build:android` → `BASE_PATH=` then `cap sync`.

---

## 5. The Central dialect layer

Written Vietnamese is standardised nationwide, so **the dialect lives entirely in a pronunciation and
vocabulary overlay, never in the text.** That is architecturally clean — one file drives it:

`corpus/published/dialect-central.json`

```jsonc
{
  "id": "central-danang",
  "label": "Trung – Đà Nẵng / Quảng Nam",
  "tones": {
    "count": 5,
    "merged": [["hỏi", "ngã"]],
    "notes": { "nặng": "low, short, glottalised — retained here unlike most Southern" },
  },
  "rimeShifts": [
    { "from": "ăn", "to": "eng", "example": ["thẳng→thẻng", "Đà Nẵng→Đà Nẽng"] },
    { "from": "oi", "to": "oai" },
    { "from": "anh", "to": "ăn|ân" },
  ],
  "initialsRetained": ["tr/ch", "s/x", "r/d/gi"],
  "lexicon": { "lợn": "heo", "gì": "chi", "ở đâu": "ở mô", "thế nào": "răng", "thế": "rứa", "kia": "tê" },
}
```

Reader behaviour driven by it:

- Any token can show a **Central pronunciation hint** (`thẳng → "thẻng"`) as an on-demand superscript.
- Northern-marked lexemes get an **"Ở Đà Nẵng: heo"** chip.
- The tone UI teaches **five** tones from lesson one and frames the hỏi/ngã merge as a _win_:
  "You'll see two marks, ̉ and ̃. Here they're one sound. That's one less tone than Hanoi."
- The retained `tr/ch`, `s/x`, `r/d/gi` distinctions are taught as the **learning advantage** they
  are — spelling maps to sound more transparently here than in Hanoi.

---

## 6. Data model

### Published content (static, content-hash versioned)

`corpus/published/stories/{id}.json`:

```jsonc
{
  "id": "dongdao-con-co-be-be",
  "title": "Con cò bé bé",
  "titleEn": "The little stork",
  "tier": 1,
  "source": { "name": "Đồng dao (oral tradition)", "license": "PD", "retrieved": "2026-08-02" },
  "grade": { "score": 2, "meanSentenceSyllables": 5.2, "top2k": 0.97, "hvDensity": 0.0 },
  "audio": {
    "file": "audio/story/a1b2c3.mp3",
    "voice": { "id": "fpt-central", "human": false, "badge": "Synthetic · Central (Huế)" },
    "sprite": [{ "sent": 0, "start": 0.0, "end": 2.14 }],
  },
  "speakers": [{ "id": "narrator", "age": "adult", "gender": "f", "toListener": "em" }],
  "sentences": [
    {
      "id": "s0",
      "en": "The little stork...",
      "tokens": [
        { "s": "con", "syl": ["con"], "pos": "Nc", "entry": "con", "cls": true, "clsFor": 1 },
        { "s": "cò", "syl": ["cò"], "pos": "N", "entry": "cò", "f0": [/* 32 pts */] },
        { "s": "bé bé", "syl": ["bé", "bé"], "pos": "A", "entry": "bé", "reduplication": true },
      ],
      "noteIds": ["cls-con", "redup-attenuative"],
    },
  ],
}
```

**The `s` + `syl` pair is the product.** Vietnamese writes syllables space-separated, so `học sinh`
is one word written as two and a beginner cannot see where words end. Exposing that boundary is the
killer feature — the exact analogue of Japanese lacking spaces, and the reason a Satori Reader for
Vietnamese is worth building.

Other published files:

- `dict/{shard}.json` — ~200 shards keyed by first syllable + `dict/index.json` (headword → shard).
  Entries carry Northern _and_ Central pronunciations, senses, `hv` morpheme refs, frequency, audio.
- **`hanviet.json`** — the vocabulary multiplier. `học` → `學` "study" → family
  `[học sinh, đại học, khoa học, học phí, văn học, toán học]`. Tapping `học` inside `học sinh` opens
  the whole family. ~60% of the lexicon is Sino-Vietnamese, so this one screen is the largest leverage
  point in the app — the analogue of Satori's kanji awareness.
- `notes.json` — compiled from `corpus/notes/*.md` (YAML frontmatter: `id`, `title`, `level`,
  `triggers`, `related`; Markdown body). The pipeline _suggests_ attachments by trigger matching; a
  human confirms via an override file.
- `manifest.json` — file list, content hashes, per-tier byte totals. Drives SW precache, offline
  download size estimates, and the Android OTA overlay.

### Local state (Dexie, DB `timconheo`)

```
cards     'id, type, due, key'    // type ∈ recognition|production|tone|classifier|hanviet
                                  // holds the full ts-fsrs Card + sourceSentenceId for context
reviews   '++id, cardId, ts'      // append-only; enables later FSRS optimisation
known     'entryKey, status'      // new|learning|known|ignored, timesSeen, firstSeen
progress  'storyId'               // lastSentenceId, sentencesRead[], minutesRead, completedAt
imports   '++id, importedAt'      // raw + generated content JSON — DEVICE ONLY
pronouns  'term'                  // kinship-term usage log
tones     '++id, ts'              // Đo Thanh attempts: syllable, score, contour
settings  'key'
```

`known` is deliberately separate from `cards`: it feeds `unknownRatio` (which drives the i+1 sort)
without forcing every word you've ever met into a drill deck. "Can read" ≠ "am studying".

**Pronouns are first-class.** Each story declares `speakers` with age/gender/relation; every pronoun
token carries `{role, term}`. The reader shows a persistent _ai nói với ai_ chip, and tapping a
pronoun explains **why that term** given the relationship. Vietnamese has no neutral "I"/"you", so
this has to be structural, not a footnote.

---

## 7. Android: Capacitor, firmly — not a TWA

I verified `applicationHost.config` has a real HTTPS binding (`*:443:ayrien.se`, HSTS on), so a TWA is
_technically_ available. **Use Capacitor anyway.**

1. **The headline features need native APIs.** System Vietnamese TTS
   (`@capacitor-community/text-to-speech`) and native `SpeechRecognizer` vi-VN
   (`@capacitor-community/speech-recognition`) are free, offline, unlimited. A TWA gets only Web
   Speech API: Android Chrome's `speechSynthesis` gives Northern "Linh", and `SpeechRecognition` is a
   cloud service with no offline path.
2. **First-run offline.** A TWA is a Chrome window at a URL — first launch needs network. Capacitor
   ships corpus and audio _inside the APK_: instant, guaranteed, works on a bus in Đà Nẵng with no signal.
3. **`assetlinks.json` fragility.** It must be served from `https://ayrien.se/.well-known/` — the
   **root** site, outside both the `/watch` and `/heo` deploy mirrors. It works until a cert renewal
   or path change, then the TWA silently degrades to a Chrome tab with a URL bar.
4. **Server-uptime coupling.** A TWA works only while the IIS box is on. A language app shouldn't have that dependency.
5. **Zero new infrastructure** — a Capacitor APK slots straight into the existing OTA pattern.

**Capacitor's one real downside, and the fix:** bundled content normally needs an APK rebuild to
update. Fix it in the `ContentSource` layer — on launch, when online, fetch
`/heo/content/manifest.json`, diff hashes against bundled assets, download changed files into an
**overlay directory that shadows the bundle**. Content ships in the APK for instant offline _and_
updates OTA without a rebuild. ~150 lines.

⚠️ **The PWA will not install or register a service worker over `http://stellar.local`** — LAN HTTP is
a non-secure origin and the localhost exemption doesn't cover LAN hostnames. Browser use must go via
`https://ayrien.se/heo/`.

---

## 8. Content pipeline

`pipeline/`, Python 3.12 via `uv`, one CLI: `python -m tch <stage>`. Each stage reads
`corpus/work/{prev}/` and writes `corpus/work/{stage}/` — resumable, diffable, independently re-runnable.

Ingestion is declarative, in `pipeline/sources/sources.yaml`:

```yaml
- id: dongdao
  tier: 1
  license: PD
  kind: inline # texts checked into corpus/raw/
- id: wikisource-tam-cam
  tier: 3
  license: CC-BY-SA-3.0
  kind: mediawiki
  api: https://vi.wikisource.org/w/api.php
  page: "Tấm Cám"
```

| Stage         | Libraries                                                                                                                                        | Output                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **fetch**     | `trafilatura`, `httpx`, MediaWiki API                                                                                                            | `raw/{id}.json` + license metadata                               |
| **normalize** | NFC; canonicalise the two tone-placement conventions (`hoà`↔`hòa`); strip ZWSP; `underthesea.sent_tokenize`                                      | `norm/{id}.json`                                                 |
| **segment**   | **`underthesea.word_tokenize`** primary + **`pyvi.ViTokenizer`** secondary; POS and NER via underthesea                                          | `seg/{id}.json` + `review/conflicts.json` where the two disagree |
| **gloss**     | Merged dict: **VNEDICT** (CC-BY 3.0) + **Wiktextract** vi→en + **undertheseanlp/dictionary** + **FVDP**. Sense pick by POS match, then frequency | `gloss/{id}.json` + `review/gloss-todo.json`                     |
| **grade**     | `wordfreq` (vi) + the §3 formula                                                                                                                 | `grade/{id}.json`                                                |
| **notes**     | trigger matching against `corpus/notes/*.md`                                                                                                     | `review/note-suggestions.json`                                   |
| **tts**       | FPT.AI TTS Central voice, per sentence; concat via `ffmpeg` (already in `.tools`)                                                                | `audio/story/{hash}.mp3` + sprite timings                        |
| **f0**        | **`parselmouth`** (Praat bindings — gives voicing decisions and intensity, which is how you _show_ nặng glottalisation), `librosa.pyin` fallback | 32-point normalised semitone contours per syllable               |
| **publish**   | —                                                                                                                                                | `corpus/published/**` + `manifest.json`                          |

**TTS quota guard.** Cache by `sha1(text + voiceId)` in `corpus/work/tts-cache/` so re-runs cost zero.
The stage refuses to start if the month's projected characters would exceed **90,000** of FPT's
100,000 free-tier allowance, and prints the projection. All TTS is **build-time only** — no runtime
key on the client, no quota burn, works offline.

**Human corrections use overrides, never edits to generated output.** `corpus/overrides/{id}.json`
holds JSON-patch fixes applied during `publish`. This single rule keeps the pipeline re-runnable
forever; without it, the first manual fix freezes it.

**Runtime segmenter for imports** (`web/src/lib/seg/`): pure-TS maximal matching over a compound trie
built at publish time from multi-syllable headwords (~40k entries, ~1–2MB brotli), with
bigram-frequency tiebreak. Import tokens are marked `approx: true` and the UI says "auto-segmented".
It is worse than underthesea and the app should admit that rather than pretend.

---

## 9. Pronunciation and tones — all free

### Đo Thanh (tone mirror) — the flagship

Reference contours are computed at **build time** with `parselmouth`, so runtime never analyses
reference audio.

Runtime: `getUserMedia` → **AudioWorklet running a hand-written YIN** (~120 lines) → learner F0 →
normalise to semitones about the learner's own median (so a male learner still compares against a
female reference) → **DTW-align** against the reference → overlay both curves.

Write YIN by hand; the JS pitch-detection packages are largely unmaintained. Keep `pitchy` around
only as a development cross-check.

Scoring is **shape-based and feature-level, never a percentage and never pass/fail.** Detect the five
Central targets and give one specific sentence of feedback:

| Tone                   | Central target              | Feedback axis                 |
| ---------------------- | --------------------------- | ----------------------------- |
| ngang                  | level, high                 | flatness, height              |
| huyền                  | low falling                 | start height, slope           |
| sắc                    | high rising                 | rise rate                     |
| **hỏi = ngã** (merged) | mid dipping-rising          | dip depth, recovery           |
| nặng                   | low, short, **glottalised** | duration, creak/voicing break |

The nặng voicing break is visible in parselmouth's voicing mask — render it as a literal gap in the
contour. Đà Nẵng retains that glottalisation where most Southern varieties don't, so it's both a real
target and a distinctive teaching moment.

### Nghe Thanh — perception before production (HVPT)

Minimal-pair identification (`ma / mà / má / mả / mạ`) drawn from **Mozilla Common Voice vi (CC0)**,
filtered by accent metadata to Central speakers, **many different voices**. High talker variability is
exactly what the high-variability phonetic training evidence base requires, and it's free with real
humans. **Ship this before the pitch tracker** — stronger evidence, lower build risk.

### TTS resolution order

1. **Pre-rendered FPT.AI Central MP3** (build time) — all bundled content. Offline, Central, zero runtime quota.
2. **Capacitor native TTS** → Android system Vietnamese voice — imports and un-rendered words, offline.
3. **Web Speech API `speechSynthesis` vi-VN** — same role in-browser. Edge → HoaiMy/NamMinh Natural; Chrome → "Linh". **All Northern.**
4. **FPT.AI live** — imports only, explicit tap only, local monthly counter, key in a local-only setting.

### The honesty rule (non-negotiable)

Every audio control carries a **voice badge**: `Human · Đà Nẵng (Common Voice)` /
`Synthetic · Central (Huế)` / `Synthetic · Northern`. FPT's Central voice is **Huế-flavoured, not
Quảng Nam** — say so in the badge and in About. Dialect fidelity is the entire value proposition;
letting a Northern TTS pass as the taught dialect would teach the wrong thing while claiming otherwise.

---

## 10. Anti-Duolingo mechanics

| Duolingo           | Tìm Con Heo                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Streak             | **Vườn (garden)** — cumulative and monotonic. Each word reaching `known` plants something; each finished story adds a row. **Nothing ever wilts, dies, or resets.** Time away removes nothing. |
| Hearts / lives     | Nothing. Wrong answers reschedule, full stop. The reader has no scoring at all.                                                                                                                |
| Daily goal         | **"Một chỗ dừng tốt"** — sessions end at natural boundaries with _"That's a good place to stop."_ No "keep going" nag, ever.                                                                   |
| Push notifications | **None.** FCM infra exists in `App_Code\FcmPush.cs` — deliberately do **not** wire it in. At most one opt-in weekly _"your reviews are here when you are"_, off by default.                    |
| XP / leaderboards  | Absent. Numbers are descriptive, not prescriptive: "you've read 2,140 syllables of real Vietnamese" — never "40% to your goal".                                                                |
| Accuracy %         | Never shown. The word _lapses_ never appears in the UI.                                                                                                                                        |

### SRS backlog — where the guilt actually lives

A standard SRS recreates the Duolingo problem the instant it says "847 due". Five mechanisms:

1. **Never display a raw due count.** Home shows one button: _"Ôn tập — khoảng 8 phút"_. Time, not quantity.
2. **Time-boxed sessions.** Pick 5/10/20 minutes (default 10). Cards drawn by _relative_ overdue-ness
   (`elapsed / scheduled`) descending, interleaved with a small new-card quota. Overflow simply isn't
   rendered. There is no "finish the deck" state to fail at.
3. **Automatic backlog forgiveness.** On first launch after >14 idle days, a one-time reschedule
   spreads every overdue card across the next 21 days weighted by FSRS `stability`. Then, once:
   _"Welcome back. I've spread your reviews over the next few weeks — nothing was lost."_ Then never
   mention it again.
4. **Reading counts as review.** Meeting a word in the reader and _not_ tapping it is an implicit "I
   knew that" — a small, capped stability nudge. This is the strongest lever in the design: **reading
   shrinks the deck**, pointing the incentive at the thing the app is actually for.
5. **Suspend is one tap and guilt-free**, reversible from the word list.

---

## 11. Visual design

"Make it look good" has a specific technical meaning in Vietnamese.

- **Diacritics stack.** `ế`, `ộ`, `ữ`, `ẳ` carry a vowel diacritic _and_ a tone mark. Most Latin
  typography breaks here — marks collide with the line above or get clipped. Use **Be Vietnam Pro**
  (designed for Vietnamese) for UI and a serif with verified full Vietnamese coverage for reading
  body text. Line-height minimum **1.75** in the reader. Self-host as woff2; never a CDN.
- **Tone marks must never be the thing that's too small to read.** Reader body text starts at 20px
  with a size control. Tone marks carry the meaning — this is an accessibility requirement, not taste.
- **Segmentation shown by grouping, not by clutter.** Multi-syllable words get a soft tinted rounded
  background, not underlines or interpuncts. Syllable spacing stays natural; the tint does the work.
- **Colour carries exactly one meaning: knownness.** `new` / `learning` / `known` as a three-step
  tint ramp. Tones are never colour-coded in body text — that's a crutch that doesn't transfer to
  real Vietnamese, and it collides with the knownness ramp. Colour-code tones **only** inside Tier 0
  drills and the tone contour view.
- **Light and dark, both first-class**, via `prefers-color-scheme` with a manual override. Warm paper
  in light, true-dim (not pure black) in dark.
- **Reading is one column, max ~34em, no chrome.** Everything else — glosses, notes, audio — arrives
  in a bottom sheet on mobile and a side panel on desktop, never a modal over the text.
- **Motion is minimal and never celebratory.** No confetti, no mascot, no sound effects on correct
  answers. Those are the exact mechanics the brief rules out.

---

## 12. Deploy

### IIS

Add **`/heo` as its own IIS application** under Default Web Site → `C:\inetpub\wwwroot\heo`, app pool
set to **No Managed Code**. A separate application, not a subfolder of `/watch`, so it inherits
neither the ASP.NET 4.8 pipeline nor `/watch`'s `Web.config`. URL: `https://ayrien.se/heo/`.

`deploy/heo.Web.config` — static only: mimeMaps for `.webmanifest`, `.apk`, `.opus`; static
compression on (add `application/json` to `<httpCompression><staticTypes>` — IIS omits it by default);
`httpErrors existingResponse="PassThrough"`; `runAllManagedModulesForAllRequests="false"`. Caching:
`content/` and `audio/` are hash-named → `max-age=31536000, immutable`; `service-worker.js`,
`manifest.webmanifest`, `version.json`, `changelog.json` → `DisableCache`.

### `deploy/push.ps1`

Mirrors `WatchTalk\push.ps1` conventions — `$tools` from the sibling `.tools` dir, `JAVA_HOME` /
`ANDROID_HOME` env, `gradle assembleRelease --no-daemon`, `Fix-UserPaths` for the ANAYPC/FHA-XPS
OneDrive split, `$LASTEXITCODE -gt 7` robocopy check.

```
.\push.ps1 -Web        # npm run build:web; robocopy build → wwwroot\heo /MIR /XF TimConHeo.apk /XD content audio
.\push.ps1 -Content    # python -m tch publish; robocopy corpus\published → heo\content; corpus\audio → heo\audio
.\push.ps1 -Android    # npm run build:android; npx cap sync android; gradle assembleRelease; APK → heo\TimConHeo.apk
.\push.ps1 -All
```

⚠️ **The `/MIR` trap they already hit.** `WatchTalk\push.ps1:143-155` copies each APK into _both_
`Website\` and the IIS folder — the `Website\` copy exists purely so the next `/MIR` doesn't delete
it, which is why two binaries totalling 22MB are committed and churn in OneDrive on every build.
Don't repeat it: use `/XF TimConHeo.apk` on the web mirror and copy the APK separately in `-Android`.
Likewise `/XD content audio` so a `-Web` deploy can't nuke the corpus.

### Version / OTA — no `.ashx`

Keep `/heo` pure static so the app pool stays No Managed Code. `push.ps1 -Android` writes
`heo\version.json`:

```json
{
  "latestVersion": "0.3.0",
  "versionCode": 30,
  "apkUrl": "TimConHeo.apk",
  "contentVersion": "2026-08-02T14:22:10Z",
  "minSupported": "0.1.0"
}
```

The app polls it with WorkManager **daily, not hourly** (WatchTalk polls hourly; this app has no
urgency), then reuses the same download + `ACTION_VIEW` installer path the phone app already uses.
Signing reuses the `local.properties` pattern verbatim, keystore under
`OneDrive\Projects\.secrets\`, never in the repo.

---

## 13. Legal separation

Two namespaces, enforced structurally rather than by discipline.

- **`corpus/published/**` is open-licensed only.** `pipeline/src/tch/licenses.py` holds an allowlist
  (`PD`, `CC0`, `CC-BY-*`, `CC-BY-SA-*`) and **`publish` hard-fails** if any source's license isn't on
  it. Every story carries `source.license`; the reader footer renders attribution automatically.
- **CC-BY-SA isolation.** Wikisource content goes in `corpus/published/sa/` with its own `NOTICE`.
  The annotations arguably form a derivative work and SA is viral, so license the annotations _for
  those stories only_ as CC-BY-SA, stated once. Recommend including it, isolated.
- **`corpus/local/` is gitignored and robocopy-excluded.** Personal imports (VnExpress etc.) live
  **only in IndexedDB on the device**, never on server disk. Cross-device transfer is a manual JSON
  export/import.
- **Do not build an import-sync endpoint.** That converts private copying into distribution. Flagged
  because it is the obvious feature to want next.
- **Genuine open question:** FPT.AI's free-tier terms on _redistributing_ pre-rendered audio inside a
  distributed APK. Single-user personal use is almost certainly fine; check before wider
  distribution. Fallback if not: bundle Common Voice CC0 human audio and use TTS at runtime only —
  arguably the better product anyway.

---

## 14. Repo structure

```
C:\Users\Administrator\OneDrive\Projects\timconheo\
  README.md  CHANGELOG.md  .gitignore
  web/
    package.json  svelte.config.js  vite.config.ts
    static/  manifest.webmanifest  icons/  fonts/
    src/lib/
      content/  ContentSource.ts  WebContentSource.ts  NativeContentSource.ts  types.ts
      reader/   Reader.svelte  Token.svelte  scaffold.ts  pronouns.ts
      dict/     lookup.ts  shards.ts  hanviet.ts
      seg/      trie.ts  maximalMatch.ts
      srs/      scheduler.ts  session.ts  backlog.ts
      audio/    player.ts  sprite.ts  tts.ts  voiceBadge.ts
      tone/     yin.worklet.ts  f0.ts  dtw.ts  ToneMeter.svelte  perception.ts
      db/       dexie.ts  migrations.ts
      import/   paste.ts  grade.ts
    src/routes/   /  /read/[id]  /review  /tones  /words  /import  /about
  pipeline/
    pyproject.toml                     # uv, requires-python = ">=3.12,<3.13"
    src/tch/  fetch.py normalize.py segment.py gloss.py grade.py notes.py tts.py f0.py publish.py licenses.py
    sources/sources.yaml
  corpus/
    raw/  work/  overrides/  notes/*.md
    published/        # ships: stories/ dict/ hanviet.json notes.json manifest.json
    published/sa/     # CC-BY-SA-derived, isolated
    audio/            # GITIGNORED — regenerable from work/tts-cache
    local/            # GITIGNORED, never deployed — personal imports
  android/            # npx cap add android output, committed
  deploy/  push.ps1  heo.Web.config
```

---

## 15. Build order

| Phase                            | Scope                                                                                                                                                                                | Proves                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **0 — "Can I read a đồng dao?"** | Pipeline fetch→normalize→segment→gloss→publish over 5 nursery rhymes. SvelteKit reader with segmentation boxes + tap-for-definition. Deploy to `/heo`. No SRS, no audio, no Android. | **The entire thesis.** If exposed word boundaries + gloss don't make đồng dao readable at zero, nothing else matters. De-risk first. |
| **1 — Tones & audio**            | Tier 0 Chữ & Thanh, FPT Central pre-render, sentence playback with highlight, **Nghe Thanh** HVPT drill from Common Voice, voice badges.                                             | The dialect claim is real and honest.                                                                                                |
| **2 — SRS**                      | ts-fsrs, Dexie, cards from tapped words, time-boxed sessions, Vườn, backlog forgiveness, reading-as-review.                                                                          | Retention without pressure mechanics.                                                                                                |
| **3 — Android**                  | Capacitor wrap, native TTS + ASR, bundled corpus + OTA overlay, `push.ps1 -Android`, `version.json`.                                                                                 | Portability and offline.                                                                                                             |
| **4 — Đo Thanh**                 | AudioWorklet YIN, DTW compare, contour overlay, feature-level feedback.                                                                                                              | The flagship. Highest technical risk — land it only once reading works.                                                              |
| **5 — Imports**                  | JS maximal-match segmenter, paste/URL import, local-only storage, `approx` markers, import-time grading.                                                                             | Tier 4 and long-term usefulness.                                                                                                     |
| **6 — Depth**                    | Hán-Việt explorer, grammar-note corpus, Tier 2–3 expansion, Quảng Nam ca dao sub-corpus.                                                                                             | The vocabulary multiplier.                                                                                                           |

---

## 16. Verification

**Phase 0 gate (the one that matters).** Open a đồng dao you have never seen, in Đầy đủ mode, and read
it start to finish without leaving the app. If you can't, the thesis is wrong — stop and reconsider
before building anything else.

Per-phase checks:

- **Pipeline** — `python -m tch publish` runs clean end-to-end; `review/conflicts.json` is
  inspectable; deliberately inserting a `license: "All rights reserved"` source makes `publish`
  hard-fail; re-running with a populated `tts-cache` issues zero API calls.
- **Grading parity** — golden-file test asserting `grade.py` and `grade.ts` give identical scores on
  the fixture set.
- **Segmentation** — hand-check `học sinh`, `đại học`, `bánh mì`, and reduplications like `bé bé`
  group correctly; a known-answer set of 100 tokens tracked as a regression test.
- **PWA** — Lighthouse installability at `https://ayrien.se/heo/`; airplane-mode test after an
  explicit "Tải về"; confirm the SW does **not** register over `http://stellar.local` (expected).
- **Audio** — seek to the middle of a story sprite in Chrome, Edge, and Android WebView (this is what
  the Workbox `RangeRequestsPlugin` is for); verify every control shows a voice badge.
- **Tones** — record a known-good `mạ` and confirm the contour shows the nặng voicing break; verify
  a male voice against a female reference still scores sensibly (the semitone normalisation).
- **SRS anti-stress** — set the clock forward 30 days, relaunch, confirm the forgiveness reschedule
  fires, the message appears exactly once, and **no raw due count is visible anywhere in the UI**.
- **Android** — sideload, airplane mode, cold start, read a bundled story; then online, confirm the
  OTA overlay picks up a content change without an APK rebuild.
- **Deploy safety** — run `-Web` and confirm `content/`, `audio/`, and `TimConHeo.apk` all survive.

---

## 17. Decisions I've made for you (flag if you disagree)

1. **Python 3.12 pinned via `uv`** — system Python 3.14 has no `underthesea` wheels. If underthesea
   won't install cleanly on Windows, fall back to `pyvi` alone, which is enough for Tiers 1–2.
2. **Wikisource CC-BY-SA is in**, isolated under `published/sa/` with its own NOTICE.
3. **Bundle Tier 0–1 audio only** in the APK (~40–80MB); Tiers 2–3 as OTA "Tải về" downloads.
   Bundling everything pushes past 150MB.
4. **Nghe Thanh (perception) ships before Đo Thanh (production)** — stronger evidence, lower risk.

## 18. Things that would be mistakes

- **Pyodide + underthesea in the browser** — 10MB+, slow, models aren't packaged for it.
- **A TWA**, even though HTTPS is confirmed available (§7).
- **Wiring in FCM because `FcmPush.cs` already exists.** Existing infra is a temptation, not a reason.
  Notifications are the exact mechanism the brief rules out.
- **SQLite-WASM for a read-only dictionary.**
- **Runtime FPT.AI calls for bundled content** — burns quota, needs a client-side key, breaks offline.
- **A server endpoint for personal imports** — turns private copying into distribution.
- **Hand-authoring "graded readers"** — that's the authored content the brief rules out, and it's an
  infinite treadmill. Annotation density is the correct difficulty knob.
- **Presenting FPT's Central voice as Quảng Nam.** It's Huế. Badge it.
- **Committing `corpus/audio/` to git** — deterministically regenerable from `work/tts-cache/`.
- **Any daily goal, session accuracy percentage, or visible due-card count.**
