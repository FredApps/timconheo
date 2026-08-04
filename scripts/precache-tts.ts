#!/usr/bin/env node
// Warms the Central-voice audio cache for the *shipped* corpus, so the first
// person to open a reading does not wait on FPT.
//
// This is deliberately a script and not a background prefetch. Nothing a user
// typed is ever sent to FPT without them pressing play; what gets warmed here is
// only text that is already in the repository.
//
//   npm run precache -- --voice myan          one voice
//   npm run precache -- --dry-run             report what is missing, generate nothing
import { STORIES, TONES } from "../app/data.js";
import { ALPHABET } from "../app/data/alphabet.js";
import { config, paths } from "../server/config.js";
import { FptTtsService, TtsError } from "../server/tts.js";
import type { TtsVoice } from "../shared/types.js";

const ALL_VOICES: TtsVoice[] = ["myan", "giahuy"];

export function precachePhrases(): string[] {
  const phrases = new Set<string>();
  for (const story of STORIES) {
    for (const sentence of story.sentences) {
      const line = sentence.tokens
        .map((token) => token.text)
        .join(" ")
        .trim();
      if (line) phrases.add(line);
      // Single words are what the word panel plays, and they are the cheapest
      // thing to have ready.
      for (const token of sentence.tokens) {
        const word = (token.entry ?? token.text).trim();
        if (word) phrases.add(word);
      }
    }
  }
  for (const tone of TONES) for (const part of tone.example.split("/")) phrases.add(part.trim());
  for (const letter of ALPHABET) phrases.add(letter.letter);
  return [...phrases].filter(Boolean).sort();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const voiceArg = args[args.indexOf("--voice") + 1];
  const voices =
    args.includes("--voice") && ALL_VOICES.includes(voiceArg as TtsVoice)
      ? [voiceArg as TtsVoice]
      : ALL_VOICES;

  const tts = new FptTtsService(config.fptKeyFile, paths.ttsCache, config.fptTtsSpeed, {
    pollTimeoutMs: config.ttsPollTimeoutMs,
  });
  const phrases = precachePhrases();
  console.log(`${phrases.length} phrases x ${voices.length} voice(s) -> ${paths.ttsCache}`);

  let generated = 0;
  let alreadyCached = 0;
  let missing = 0;

  for (const voice of voices) {
    for (const phrase of phrases) {
      if (dryRun) {
        const cached = await tts.isCached(phrase, voice).catch(() => false);
        if (cached) alreadyCached += 1;
        else missing += 1;
        continue;
      }
      try {
        const result = await tts.warm(phrase, voice);
        if (result === "generated") generated += 1;
        else alreadyCached += 1;
      } catch (error) {
        const code = error instanceof TtsError ? error.code : "UNKNOWN";
        // Quota and missing-key are terminal for the whole run: continuing would
        // just print the same failure several hundred more times.
        if (code === "FPT_QUOTA" || code === "FPT_NOT_CONFIGURED") {
          console.error(`Stopping: ${code}. ${error instanceof Error ? error.message : ""}`);
          console.log(`Generated ${generated}, already cached ${alreadyCached} before stopping.`);
          process.exitCode = 1;
          return;
        }
        console.error(`  ${voice} "${phrase}": ${code}`);
        missing += 1;
      }
    }
  }

  if (dryRun) console.log(`Dry run: ${alreadyCached} cached, ${missing} would be generated.`);
  else console.log(`Generated ${generated}, already cached ${alreadyCached}, failed ${missing}.`);
}

await main();
