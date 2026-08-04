import { useState } from "react";
import { Volume2 } from "lucide-react";
import { ALPHABET } from "../../data/alphabet";
import { BiText, useT } from "../../i18n";
import { useSpeech } from "../../lib/speech";

/**
 * Tier 0's alphabet lesson. Tapping a letter shows what it is, what it sounds
 * like, and the nearest English sound -- which is the actual lesson, rather than
 * a dictionary gloss saying "letter".
 */
export function AlphabetLab() {
  const t = useT();
  const { speak } = useSpeech();
  const [selected, setSelected] = useState(ALPHABET[0]);

  return (
    <div className="alphabet-lab paper-card">
      <div className="alphabet-row" role="group" aria-label={t("reader.help")}>
        {ALPHABET.map((letter) => (
          <button
            key={letter.letter}
            type="button"
            className={selected.letter === letter.letter ? "active" : ""}
            aria-pressed={selected.letter === letter.letter}
            onClick={() => setSelected(letter)}
          >
            <span lang="vi">{letter.letter}</span>
          </button>
        ))}
      </div>

      <div className="alphabet-detail">
        <div className="alphabet-headline">
          <strong lang="vi">{selected.letter}</strong>
          <button
            type="button"
            className="round-audio"
            onClick={() => void speak(selected.letter).catch(() => undefined)}
            aria-label={t("reader.listenWord", { word: selected.letter })}
          >
            <Volume2 size={20} aria-hidden="true" />
          </button>
        </div>
        <p className="alphabet-name">
          <BiText value={selected.name} />
        </p>
        <p className="pronunciation" lang="vi">
          {selected.ipa}
        </p>
        <p>
          <BiText value={selected.englishNearest} />
        </p>
        <p className="word-note">
          <BiText value={selected.note} />
        </p>
      </div>
    </div>
  );
}
