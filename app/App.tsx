"use client";

import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft,
  AudioLines,
  BookOpenText,
  Check,
  ChevronRight,
  CircleHelp,
  CloudDownload,
  Ear,
  Flower2,
  Headphones,
  Info,
  Languages,
  Leaf,
  Menu,
  Mic,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Sprout,
  LogOut,
  Sun,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rating } from "ts-fsrs";
import type { CardRecord, ImportRecord, WordRecord } from "./lib/api";
import { api } from "./lib/api";
import type { User } from "../shared/types";
import { detectPitch, normalizeContour, toneFeedback } from "./lib/pitch";
import { STORIES, TONES } from "./data";
import type { AppView, Story, Token, ToneKey, WordStatus } from "./types";

type ScaffoldMode = "full" | "assisted" | "raw";
type ThemeMode = "light" | "dark" | "system";

const NAV_ITEMS: Array<{ view: AppView; label: string; short: string; icon: typeof BookOpenText }> = [
  { view: "home", label: "Hôm nay", short: "Nhà", icon: Sprout },
  { view: "review", label: "Ôn tập", short: "Ôn", icon: RotateCcw },
  { view: "tones", label: "Thanh điệu", short: "Thanh", icon: AudioLines },
  { view: "garden", label: "Vườn", short: "Vườn", icon: Flower2 },
  { view: "words", label: "Từ của tôi", short: "Từ", icon: Languages },
];

function PigMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`pig-mark${small ? " pig-mark--small" : ""}`} aria-hidden="true">
      <span className="pig-ear pig-ear--left" />
      <span className="pig-ear pig-ear--right" />
      <span className="pig-face">
        <span className="pig-eye pig-eye--left" />
        <span className="pig-eye pig-eye--right" />
        <span className="pig-snout"><i /><i /></span>
      </span>
    </span>
  );
}

function StoryMotif({ pattern }: { pattern: Story["pattern"] }) {
  return (
    <div className={`story-motif story-motif--${pattern}`} aria-hidden="true">
      <span className="motif-sun" />
      <span className="motif-hill motif-hill--back" />
      <span className="motif-hill motif-hill--front" />
      <span className="motif-animal"><span /></span>
      <span className="motif-grass motif-grass--one" />
      <span className="motif-grass motif-grass--two" />
    </div>
  );
}

function AppHeader({
  currentView,
  onNavigate,
  theme,
  onTheme,
  username,
  onSignOut,
}: {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  theme: ThemeMode;
  onTheme: () => void;
  username: string;
  onSignOut: () => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onNavigate("home")} aria-label="Tìm Con Heo — về trang nhà">
        <PigMark small />
        <span className="brand-name">Tìm Con Heo</span>
        <span className="brand-dialect">Đà Nẵng</span>
      </button>
      <nav className="desktop-nav" aria-label="Điều hướng chính">
        {NAV_ITEMS.map(({ view, label }) => (
          <button key={view} className={currentView === view ? "active" : ""} onClick={() => onNavigate(view)}>{label}</button>
        ))}
      </nav>
      <div className="topbar-actions">
        <button className="icon-button" onClick={onTheme} aria-label={`Đổi giao diện, hiện tại: ${theme}`}>
          {theme === "light" ? <Sun size={18} /> : theme === "dark" ? <Moon size={18} /> : <Settings2 size={18} />}
        </button>
        <button className="icon-button" onClick={() => void onSignOut()} aria-label={`Đăng xuất khỏi ${username}`} title={`${username} — đăng xuất`}>
          <LogOut size={18} />
        </button>
        <button className="icon-button menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Mở trình đơn" aria-expanded={menuOpen}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <div className="overflow-menu">
          <button onClick={() => { onNavigate("import"); setMenuOpen(false); }}><Upload size={17} /> Nhập bài riêng</button>
          <button onClick={() => { onNavigate("about"); setMenuOpen(false); }}><Info size={17} /> Về ứng dụng</button>
        </div>
      )}
    </header>
  );
}

function BottomNav({ currentView, onNavigate }: { currentView: AppView; onNavigate: (view: AppView) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Điều hướng di động">
      {NAV_ITEMS.map(({ view, short, icon: Icon }) => (
        <button key={view} className={currentView === view ? "active" : ""} onClick={() => onNavigate(view)}>
          <Icon size={20} strokeWidth={currentView === view ? 2.3 : 1.8} />
          <span>{short}</span>
        </button>
      ))}
    </nav>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "red" | "green" | "ochre" }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

function HomeView({
  onRead,
  onNavigate,
  knownCount,
  completedStories,
}: {
  onRead: (story: Story) => void;
  onNavigate: (view: AppView) => void;
  knownCount: number;
  completedStories: string[];
}) {
  const featured = STORIES[0];
  return (
    <main className="page home-page">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Chủ nhật · học theo nhịp của bạn</p>
          <h1>Chào bạn, đọc một chút <em>hè?</em></h1>
          <p>Không mục tiêu mỗi ngày. Không có gì mất đi khi bạn nghỉ.</p>
        </div>
        <div className="welcome-pig"><PigMark /><span>ụt ịt!</span></div>
      </section>

      <section className="continue-card paper-card">
        <StoryMotif pattern={featured.pattern} />
        <div className="continue-copy">
          <div className="card-topline"><Pill tone="red">BẬC 1 · ĐỒNG DAO</Pill><span className="soft-label">6% từ mới · khoảng 3 phút</span></div>
          <h2>{featured.title}</h2>
          <p className="story-translation">{featured.titleEn}</p>
          <p>{featured.description}</p>
          <div className="continue-actions">
            <button className="primary-button" onClick={() => onRead(featured)}><BookOpenText size={18} /> {completedStories.includes(featured.id) ? "Đọc lại" : "Bắt đầu đọc"}</button>
            <span><Check size={16} /> {featured.sentences.length} câu ngắn</span>
          </div>
        </div>
      </section>

      <section className="quiet-stats" aria-label="Tiến trình tích lũy">
        <div><span className="stat-icon"><Leaf size={19} /></span><strong>{knownCount}</strong><span>từ đã bén rễ</span></div>
        <div><span className="stat-icon"><BookOpenText size={19} /></span><strong>126</strong><span>âm tiết thật đã đọc</span></div>
        <div><span className="stat-icon"><Sprout size={19} /></span><strong>4</strong><span>buổi đọc tự nhiên</span></div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">Sẵn sàng</p><h2>Vừa sức với bạn</h2></div>
          <p>Xếp theo lượng từ mới của riêng bạn, không phải một cấp độ cứng nhắc.</p>
        </div>
        <div className="story-grid">
          {STORIES.slice(1, 4).map((story) => (
            <article key={story.id} className="story-card paper-card">
              <StoryMotif pattern={story.pattern} />
              <div className="story-card-copy">
                <div className="card-topline"><Pill>{story.kind}</Pill><span className="difficulty-dots" aria-label={`Độ khó ${story.difficulty} trên 10`}>{Array.from({ length: 4 }, (_, index) => <i key={index} className={index < Math.ceil(story.difficulty / 2) ? "filled" : ""} />)}</span></div>
                <h3>{story.title}</h3>
                <p className="story-translation">{story.titleEn}</p>
                <p className="story-description">{story.description}</p>
                <div className="story-meta"><span>{Math.round(story.unknownRatio * 100)}% từ mới</span><span>·</span><span>{story.minutes} phút</span></div>
                <button className="text-button" onClick={() => onRead(story)}>Mở bài đọc <ChevronRight size={17} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-split">
        <article className="tone-teaser paper-card">
          <div className="teaser-icon"><Ear size={24} /></div>
          <div><p className="eyebrow">Nghe thanh</p><h2>Hai dấu, một âm</h2><p>Ở Đà Nẵng, <strong>hỏi</strong> và <strong>ngã</strong> đi cùng một đường thanh. Ít hơn Hà Nội một thanh để nhớ.</p></div>
          <button className="secondary-button" onClick={() => onNavigate("tones")}><Headphones size={17} /> Nghe thử</button>
        </article>
        <article className="review-teaser paper-card">
          <div><p className="eyebrow">Ôn tập</p><h2>Khoảng 5 phút</h2><p>Một nắm nhỏ những từ đáng gặp lại. Phần còn lại có thể chờ.</p></div>
          <button className="secondary-button" onClick={() => onNavigate("review")}><RotateCcw size={17} /> Bắt đầu</button>
        </article>
      </section>

      <button className="import-banner" onClick={() => onNavigate("import")}>
        <span className="import-icon"><Upload size={20} /></span>
        <span><strong>Có một bài tiếng Việt muốn đọc?</strong><small>Dán văn bản vào — bài chỉ nằm trên thiết bị này.</small></span>
        <ChevronRight size={20} />
      </button>
    </main>
  );
}

function speakVietnamese(text: string, onEnd?: () => void) {
  if (Capacitor.isNativePlatform()) {
    void import("@capacitor-community/text-to-speech").then(async ({ TextToSpeech }) => {
      await TextToSpeech.stop();
      await TextToSpeech.speak({ text, lang: "vi-VN", rate: 0.82, pitch: 1, volume: 1 });
      onEnd?.();
    }).catch(() => onEnd?.());
    return;
  }
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";
  utterance.rate = 0.82;
  utterance.onend = () => onEnd?.();
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("vi")) ?? null;
  window.speechSynthesis.speak(utterance);
}

function stopVietnamese() {
  window.speechSynthesis?.cancel();
  if (Capacitor.isNativePlatform()) void import("@capacitor-community/text-to-speech").then(({ TextToSpeech }) => TextToSpeech.stop()).catch(() => undefined);
}

function ReaderView({
  story,
  statuses,
  onBack,
  onRemember,
  onStatus,
  onComplete,
}: {
  story: Story;
  statuses: Record<string, WordStatus>;
  onBack: () => void;
  onRemember: (token: Token, sentenceId: string) => Promise<void>;
  onStatus: (entry: string, status: WordStatus, gloss?: string) => Promise<void>;
  onComplete: () => void;
}) {
  const [mode, setMode] = useState<ScaffoldMode>("full");
  const [fontSize, setFontSize] = useState(22);
  const [selected, setSelected] = useState<{ token: Token; sentenceId: string } | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [showCentral, setShowCentral] = useState(true);

  const playSentence = (index: number) => {
    setPlaying(index);
    const text = story.sentences[index].tokens.map((token) => token.text).join(" ");
    speakVietnamese(text, () => setPlaying(null));
  };

  const playAll = (index = 0) => {
    if (index >= story.sentences.length) { setPlaying(null); return; }
    setPlaying(index);
    const text = story.sentences[index].tokens.map((token) => token.text).join(" ");
    speakVietnamese(text, () => playAll(index + 1));
  };

  useEffect(() => () => stopVietnamese(), []);

  return (
    <main className={`reader-page reader-mode--${mode}${selected ? " panel-open" : ""}`}>
      <div className="reader-toolbar">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Thư viện</button>
        <div className="reader-tools">
          <div className="segmented-control" aria-label="Mức trợ giúp">
            {(["full", "assisted", "raw"] as ScaffoldMode[]).map((value) => (
              <button key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{value === "full" ? "Đầy đủ" : value === "assisted" ? "Vừa" : "Trần"}</button>
            ))}
          </div>
          <label className="font-control" title="Cỡ chữ"><span>A</span><input type="range" min="19" max="30" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} aria-label="Cỡ chữ bài đọc" /><strong>A</strong></label>
          <button className={`icon-button${showCentral ? " selected" : ""}`} onClick={() => setShowCentral((value) => !value)} aria-label="Gợi ý cách nói miền Trung"><Languages size={18} /></button>
        </div>
      </div>

      <article className="reader-column">
        <header className="reader-heading">
          <p className="eyebrow">Bậc {story.tier} · {story.kind}</p>
          <h1>{story.title}</h1>
          <p className="story-translation">{story.titleEn}</p>
          <div className="reader-meta"><Pill tone="green">{Math.round(story.unknownRatio * 100)}% từ mới</Pill><span>{story.minutes} phút</span><span>Độ khó {story.difficulty}/10</span></div>
          <button className="audio-button" onClick={() => playing === null ? playAll() : (stopVietnamese(), setPlaying(null))}>
            {playing === null ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}
            {playing === null ? "Nghe toàn bài" : "Dừng lại"}
          </button>
          <div className="voice-badge"><span className="voice-dot" /> Tổng hợp · giọng hệ thống vi-VN <CircleHelp size={13} /></div>
        </header>

        <div className="story-text" style={{ fontSize: `${fontSize}px` }}>
          {story.sentences.map((sentence, index) => (
            <section key={sentence.id} className={`reader-sentence${playing === index ? " is-playing" : ""}`}>
              <button className="sentence-audio" onClick={() => playSentence(index)} aria-label={`Nghe câu ${index + 1}`}><Volume2 size={16} /></button>
              <div className="token-line">
                {sentence.tokens.map((token) => {
                  const status = statuses[token.entry] ?? "new";
                  return (
                    <button
                      key={`${sentence.id}-${token.text}`}
                      className={`reader-token token--${status}${selected?.token.entry === token.entry ? " selected" : ""}`}
                      onClick={() => setSelected({ token, sentenceId: sentence.id })}
                    >
                      <span className="token-word">{token.text}</span>
                      {mode === "full" && <span className="token-gloss">{token.gloss}</span>}
                      {showCentral && token.central && <span className="central-hint">Trung: {token.central.includes(":") ? token.central.split(":").at(-1) : token.central}</span>}
                    </button>
                  );
                })}
              </div>
              {mode !== "raw" && <p className={`sentence-translation${mode === "assisted" ? " assisted" : ""}`}>{sentence.translation}</p>}
            </section>
          ))}
        </div>

        <footer className="reader-footer">
          <div className="end-mark"><span /><PigMark small /><span /></div>
          <h2>Một chỗ dừng tốt.</h2>
          <p>Bạn vừa đọc {story.sentences.flatMap((sentence) => sentence.tokens).length} từ trong tiếng Việt thật.</p>
          <p className="attribution">Nguồn: {story.source} · {story.license}</p>
          <button className="primary-button" onClick={() => { onComplete(); onBack(); }}><Check size={17} /> Đã đọc xong</button>
        </footer>
      </article>

      {selected && (
        <aside className="word-panel" aria-label={`Chi tiết từ ${selected.token.entry}`}>
          <div className="panel-handle" />
          <button className="panel-close" onClick={() => setSelected(null)} aria-label="Đóng"><X size={19} /></button>
          <p className="eyebrow">{selected.token.pos ?? "từ"}</p>
          <h2>{selected.token.entry}</h2>
          {selected.token.pronunciation && <p className="pronunciation">/{selected.token.pronunciation}/ <button onClick={() => speakVietnamese(selected.token.entry)} aria-label="Nghe từ"><Volume2 size={16} /></button></p>}
          <p className="definition">{selected.token.gloss}</p>
          {selected.token.detail && <div className="word-note"><Info size={17} /><p>{selected.token.detail}</p></div>}
          {selected.token.central && <div className="central-card"><span>Ở Đà Nẵng</span><strong>{selected.token.central}</strong></div>}
          {selected.token.hanViet && (
            <div className="hanviet-card"><span className="han-character">{selected.token.hanViet.character}</span><div><small>Hán–Việt · {selected.token.hanViet.meaning}</small><p>{selected.token.hanViet.family.join(" · ")}</p></div></div>
          )}
          <div className="knownness-picker">
            <span>Từ này với bạn</span>
            <div>
              <button className={(statuses[selected.token.entry] ?? "new") === "new" ? "active" : ""} onClick={() => onStatus(selected.token.entry, "new", selected.token.gloss)}>Mới</button>
              <button className={statuses[selected.token.entry] === "learning" ? "active" : ""} onClick={() => onStatus(selected.token.entry, "learning", selected.token.gloss)}>Đang học</button>
              <button className={statuses[selected.token.entry] === "known" ? "active" : ""} onClick={() => onStatus(selected.token.entry, "known", selected.token.gloss)}>Đã biết</button>
            </div>
          </div>
          <button className="primary-button panel-save" onClick={async () => { await onRemember(selected.token, selected.sentenceId); setSelected(null); }}><Leaf size={17} /> Lưu để gặp lại</button>
          <p className="panel-footnote">Gặp từ này khi đọc cũng sẽ giúp lịch ôn nhẹ hơn.</p>
        </aside>
      )}
    </main>
  );
}

function ToneCanvas({ reference, attempt }: { reference: number[]; attempt: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);
    context.strokeStyle = getComputedStyle(canvas).getPropertyValue("--tone-grid").trim() || "#ded6c8";
    context.lineWidth = 1;
    for (let row = 1; row < 4; row += 1) {
      context.beginPath(); context.moveTo(0, (height / 4) * row); context.lineTo(width, (height / 4) * row); context.stroke();
    }
    const draw = (values: number[], color: string, dashed = false) => {
      if (values.length < 2) return;
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = dashed ? 3 : 4;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.setLineDash(dashed ? [7, 7] : []);
      values.forEach((value, index) => {
        const x = 12 + (index / (values.length - 1)) * (width - 24);
        const y = height - 15 - value * (height - 30);
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.stroke();
      context.setLineDash([]);
    };
    draw(reference, getComputedStyle(canvas).getPropertyValue("--lacquer").trim() || "#a53c32");
    draw(attempt, getComputedStyle(canvas).getPropertyValue("--ink").trim() || "#24342d", true);
  }, [reference, attempt]);
  return <canvas ref={canvasRef} className="tone-canvas" aria-label="Đường thanh mẫu và đường thanh của bạn" />;
}

function ToneLab() {
  const [selectedTone, setSelectedTone] = useState<ToneKey>("hỏi-ngã");
  const [attempt, setAttempt] = useState<number[]>([]);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("Bấm ghi âm, nói một âm tiết, rồi xem hình dáng giọng của bạn.");
  const stopRef = useRef<(() => void) | null>(null);
  const tone = TONES.find((item) => item.key === selectedTone)!;

  const stopRecording = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  const startRecording = async () => {
    if (recording) { stopRecording(); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setMessage("Trình duyệt này chưa cho phép ghi âm."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const pitches: number[] = [];
      let frame = 0;
      let active = true;
      setAttempt([]);
      setMessage("Đang nghe… nói tự nhiên, không cần cố quá.");
      setRecording(true);
      const capture = () => {
        if (!active) return;
        analyser.getFloatTimeDomainData(samples);
        if (frame % 3 === 0) {
          const pitch = detectPitch(samples, audioContext.sampleRate);
          if (pitch) pitches.push(pitch);
        }
        frame += 1;
        requestAnimationFrame(capture);
      };
      capture();
      const finish = () => {
        if (!active) return;
        active = false;
        stream.getTracks().forEach((track) => track.stop());
        void audioContext.close();
        setRecording(false);
        const normalized = normalizeContour(pitches);
        setAttempt(normalized);
        setMessage(toneFeedback(tone.contour, normalized));
      };
      stopRef.current = finish;
      window.setTimeout(finish, 2800);
    } catch {
      setRecording(false);
      setMessage("Chưa dùng được mic. Bạn có thể cho phép mic trong trình duyệt rồi thử lại.");
    }
  };

  useEffect(() => () => stopRef.current?.(), []);
  return (
    <div className="tone-lab paper-card">
      <div className="tone-tabs" role="tablist" aria-label="Chọn thanh điệu">
        {TONES.map((item) => <button key={item.key} role="tab" aria-selected={selectedTone === item.key} className={selectedTone === item.key ? "active" : ""} onClick={() => { setSelectedTone(item.key); setAttempt([]); setMessage("Nghe mẫu, rồi ghi lại giọng của bạn."); }}><span>{item.example}</span><small>{item.label}</small></button>)}
      </div>
      <div className="tone-workbench">
        <div className="tone-syllable">
          <span className="tone-mark">{tone.mark}</span>
          <strong>{tone.example}</strong>
          <small>{tone.description}</small>
          <button className="round-audio" onClick={() => speakVietnamese(tone.example)} aria-label={`Nghe ${tone.example}`}><Volume2 size={20} /></button>
        </div>
        <div className="tone-chart-wrap">
          <div className="chart-labels"><span>cao</span><span>thấp</span></div>
          <ToneCanvas reference={tone.contour} attempt={attempt} />
          <div className="chart-legend"><span><i className="sample-line" /> mẫu</span>{attempt.length > 1 && <span><i className="attempt-line" /> bạn</span>}</div>
        </div>
        <div className="record-area">
          <button className={`record-button${recording ? " recording" : ""}`} onClick={startRecording}><Mic size={22} />{recording ? "Dừng" : "Ghi âm"}</button>
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
}

function TonesView() {
  const [heard, setHeard] = useState<string | null>(null);
  const pair = ["mả", "mã"];
  const playPair = () => {
    const choice = pair[Math.floor(Math.random() * pair.length)];
    setHeard(choice);
    speakVietnamese(choice);
  };
  return (
    <main className="page feature-page">
      <section className="feature-heading">
        <div><p className="eyebrow">Chữ & thanh · bậc 0</p><h1>Năm đường đi của giọng</h1><p>Tiếng Đà Nẵng gộp hỏi và ngã. Bạn vẫn đọc hai dấu khác nhau, nhưng tai chỉ cần học một hình dáng.</p></div>
        <div className="tone-count"><strong>5</strong><span>thanh để nghe</span></div>
      </section>
      <ToneLab />
      <section className="perception-card paper-card">
        <div className="teaser-icon"><Ear size={24} /></div>
        <div><p className="eyebrow">Nghe trước, nói sau</p><h2>Bạn nghe dấu nào?</h2><p>Hai chữ dưới đây khác dấu trên trang nhưng cùng một đường thanh trong giọng Đà Nẵng.</p></div>
        <button className="secondary-button" onClick={playPair}><Play size={16} fill="currentColor" /> Phát âm tiết</button>
        <div className="pair-buttons">
          {pair.map((item) => <button key={item} onClick={() => setHeard(item)}>{item}</button>)}
        </div>
        {heard && <p className="gentle-answer"><Sparkles size={16} /> Đúng hướng rồi: cả <strong>mả</strong> và <strong>mã</strong> dùng đường võng xuống rồi lên.</p>}
      </section>
      <aside className="honesty-note"><Info size={18} /><p><strong>Về giọng mẫu:</strong> trình duyệt dùng giọng vi-VN có sẵn trên thiết bị và có thể là giọng Bắc. Mọi nút âm thanh luôn ghi rõ nguồn giọng; ứng dụng không bao giờ gọi giọng Bắc là giọng Đà Nẵng.</p></aside>
    </main>
  );
}

function ReviewView({ cards, onRefresh }: { cards: CardRecord[]; onRefresh: () => Promise<void> }) {
  const [minutes, setMinutes] = useState(5);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [started, setStarted] = useState(false);
  const shownCards = cards.slice(0, Math.max(3, minutes));
  const current = shownCards[index];

  const rate = async (rating: Rating) => {
    if (!current) return;
    await api.reviewCard(current.id, rating);
    if (index + 1 >= shownCards.length) { await onRefresh(); setStarted(false); setIndex(0); setRevealed(false); }
    else { setIndex((value) => value + 1); setRevealed(false); }
  };

  if (!started) return (
    <main className="page feature-page review-page">
      <section className="feature-heading"><div><p className="eyebrow">Không có hàng chờ để thất bại</p><h1>Ôn khoảng {minutes} phút</h1><p>Chọn một khoảng thời gian. Mình lấy vài từ hữu ích nhất; những từ khác cứ nằm yên ở đó.</p></div><div className="review-clock"><span>{minutes}</span><small>phút</small></div></section>
      <section className="session-picker paper-card">
        <p>Bạn muốn ngồi lại bao lâu?</p>
        <div>{[5, 10, 20].map((value) => <button key={value} className={minutes === value ? "active" : ""} onClick={() => setMinutes(value)}>{value} phút</button>)}</div>
        {cards.length > 0 ? <button className="primary-button" onClick={() => setStarted(true)}><Play size={17} fill="currentColor" /> Bắt đầu nhẹ nhàng</button> : <div className="empty-review"><PigMark /><h2>Chưa có từ nào cần ôn</h2><p>Chạm vào một từ trong bài đọc rồi chọn “Lưu để gặp lại”.</p></div>}
      </section>
      <p className="soft-center">Ứng dụng không hiện số thẻ đến hạn. Nghỉ lâu thì lịch sẽ tự giãn ra.</p>
    </main>
  );

  return (
    <main className="page review-session">
      <div className="review-session-top"><button className="back-button" onClick={() => setStarted(false)}><X size={18} /> Kết thúc ở đây</button><span>khoảng {Math.max(1, minutes - index)} phút nữa</span></div>
      <div className="review-progress"><i style={{ width: `${((index + (revealed ? 0.5 : 0)) / Math.max(shownCards.length, 1)) * 100}%` }} /></div>
      <section className="flash-card paper-card">
        <p className="eyebrow">Gặp lại trong ngữ cảnh</p>
        <button className="word-audio" onClick={() => speakVietnamese(current?.entry ?? "")}><Volume2 size={18} /></button>
        <h1>{current?.entry}</h1>
        {!revealed ? <button className="primary-button reveal-button" onClick={() => setRevealed(true)}>Xem nghĩa</button> : <>
          <p className="flash-gloss">{current?.gloss}</p>
          <p className="context-line">“{current?.entry}” đã xuất hiện trong bài đồng dao bạn đang đọc.</p>
          <div className="rating-row"><button onClick={() => rate(Rating.Again)}>Cần gặp lại</button><button onClick={() => rate(Rating.Hard)}>Hơi khó</button><button onClick={() => rate(Rating.Good)}>Nhớ rồi</button><button onClick={() => rate(Rating.Easy)}>Rất quen</button></div>
        </>}
      </section>
      <p className="soft-center">Không có điểm đúng sai. Câu trả lời chỉ sắp lại lần gặp tới.</p>
    </main>
  );
}

function GardenView({ knownCount, completed }: { knownCount: number; completed: number }) {
  const plantCount = knownCount;
  return (
    <main className="page garden-page">
      <section className="feature-heading"><div><p className="eyebrow">Chỉ lớn lên, không bao giờ héo</p><h1>Vườn của bạn</h1><p>Mỗi từ bạn thật sự nhận ra gieo một mầm. Mỗi bài đọc xong mở thêm một luống. Thời gian nghỉ không lấy đi điều gì.</p></div><div className="garden-total"><strong>{plantCount}</strong><span>mầm đã bén rễ</span></div></section>
      <section className="garden-scene paper-card" aria-label={`${plantCount} cây từ vựng và ${completed} hàng bài đọc`}>
        <div className="garden-sun" />
        <div className="cloud cloud-one" /><div className="cloud cloud-two" />
        <div className="garden-hills" />
        <div className="garden-plants">
          {Array.from({ length: Math.min(plantCount, 24) }, (_, index) => <span key={index} className={`plant plant-${(index % 4) + 1}`}><i /><b /></span>)}
        </div>
        <div className="garden-pig"><PigMark /><span className="pig-body" /></div>
        <div className="garden-ground" />
      </section>
      <div className="garden-notes"><article><Leaf size={20} /><div><strong>Từ đã bén rễ</strong><p>Bạn nhận ra chúng khi đọc mà không cần mở nghĩa.</p></div></article><article><BookOpenText size={20} /><div><strong>{completed} luống bài đọc</strong><p>Một luống chỉ ghi lại điều đã làm, không phải mục tiêu phải đạt.</p></div></article></div>
    </main>
  );
}

function WordsView({ words, onStatus }: { words: WordRecord[]; onStatus: (entry: string, status: WordStatus) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | WordStatus>("all");
  const merged = useMemo(() => {
    return words.filter((word) => (filter === "all" || word.status === filter) && word.entry.toLowerCase().includes(query.toLowerCase()));
  }, [words, query, filter]);
  return (
    <main className="page feature-page words-page">
      <section className="feature-heading"><div><p className="eyebrow">Một cuốn sổ tự lớn lên</p><h1>Từ của tôi</h1><p>Biết một từ khi đọc không bắt buộc bạn phải ôn nó. Danh sách từ và bộ thẻ là hai thứ riêng nhau.</p></div></section>
      <div className="word-controls"><label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm một từ…" /></label><div className="filter-row">{(["all", "new", "learning", "known"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "Tất cả" : value === "new" ? "Mới" : value === "learning" ? "Đang học" : "Đã biết"}</button>)}</div></div>
      <div className="word-list paper-card">
        {merged.length === 0 && <div className="empty-words"><PigMark /><h2>Chưa có từ nào ở đây</h2><p>Mở một bài đọc, chạm vào từ rồi lưu lại khi bạn muốn.</p></div>}
        {merged.map((word) => <article key={word.entry}><span className={`status-seed status-seed--${word.status}`} /><div><h3>{word.entry}</h3><p>{word.gloss}</p></div><span className="seen-count">đã gặp {word.timesSeen} lần</span><select value={word.status} onChange={(event) => onStatus(word.entry, event.target.value as WordStatus)} aria-label={`Trạng thái từ ${word.entry}`}><option value="new">Mới</option><option value="learning">Đang học</option><option value="known">Đã biết</option><option value="ignored">Bỏ qua</option></select></article>)}
      </div>
    </main>
  );
}

const COMMON_COMPOUNDS = ["học sinh", "đại học", "bánh mì", "cành tre", "đi chơi", "thầy thuốc", "Đà Nẵng", "Việt Nam"];
function segmentImport(raw: string) {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  const result: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const pair = `${words[index]} ${words[index + 1] ?? ""}`.replace(/[.,!?;:]+$/g, "");
    if (COMMON_COMPOUNDS.some((compound) => compound.toLocaleLowerCase("vi") === pair.toLocaleLowerCase("vi"))) { result.push(`${words[index]} ${words[index + 1]}`); index += 1; }
    else result.push(words[index]);
  }
  return result;
}

function ImportView({ imports, onSaved }: { imports: ImportRecord[]; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [raw, setRaw] = useState("");
  const [saved, setSaved] = useState(false);
  const tokens = useMemo(() => segmentImport(raw), [raw]);
  const difficulty = Math.min(10, Math.max(1, Math.round(1 + Math.sqrt(tokens.length) / 1.8)));
  const save = async () => {
    if (!raw.trim()) return;
    await api.addImport(title.trim() || "Bài đọc của tôi", raw.trim(), difficulty);
    setSaved(true); await onSaved();
  };
  return (
    <main className="page feature-page import-page">
      <section className="feature-heading"><div><p className="eyebrow">Bài riêng · chỉ trên thiết bị này</p><h1>Biến văn bản thật thành bài đọc</h1><p>Dán một đoạn tiếng Việt. Ứng dụng sẽ thử nhóm các từ nhiều âm tiết và cho bạn chạm từng cụm để đọc dễ hơn.</p></div><div className="local-only"><CloudDownload size={20} /><span>Không tải lên máy chủ</span></div></section>
      <section className="import-workspace">
        <div className="import-form paper-card"><label>Tên bài<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Tin Đà Nẵng sáng nay" /></label><label>Văn bản<textarea value={raw} onChange={(event) => { setRaw(event.target.value); setSaved(false); }} placeholder="Dán văn bản tiếng Việt vào đây…" rows={10} /></label><div className="import-form-bottom"><span>{tokens.length} cụm · độ khó ước tính {difficulty}/10</span><button className="primary-button" onClick={save} disabled={!raw.trim()}><Upload size={17} /> Lưu trên máy</button></div>{saved && <p className="save-confirm"><Check size={16} /> Đã lưu. Văn bản không rời thiết bị này.</p>}</div>
        <div className="import-preview paper-card"><div className="preview-title"><div><p className="eyebrow">Xem trước</p><h2>{title || "Bài đọc của tôi"}</h2></div><Pill tone="ochre">tự động tách từ</Pill></div>{raw ? <div className="preview-tokens">{tokens.map((token, index) => <button key={`${token}-${index}`} title="Tự động tách từ — chạm để nghe" onClick={() => speakVietnamese(token)}>{token}</button>)}</div> : <div className="preview-empty"><PigMark /><p>Văn bản đã tách từ sẽ hiện ở đây.</p></div>}<p className="approx-note"><Info size={15} /> Tách từ tự động có thể sai. Các nhóm mờ là gợi ý, không phải phân tích chuyên gia.</p></div>
      </section>
      {imports.length > 0 && <section className="saved-imports"><h2>Đã lưu trên thiết bị</h2>{imports.map((item) => <article key={item.id} className="paper-card"><div><strong>{item.title}</strong><p>{item.raw.slice(0, 100)}{item.raw.length > 100 ? "…" : ""}</p></div><Pill>độ khó {item.difficulty}/10</Pill></article>)}</section>}
    </main>
  );
}

function AboutView() {
  return (
    <main className="page feature-page about-page">
      <section className="about-hero"><PigMark /><p className="eyebrow">Tìm Con Heo</p><h1>Đọc tiếng Việt thật,<br />từng cụm một.</h1><p>Một công cụ chú giải dành cho người mới bắt đầu, với tai hướng về Đà Nẵng và Quảng Nam.</p></section>
      <div className="about-grid"><article className="paper-card"><Sprout size={22} /><h2>Không tạo áp lực</h2><p>Không streak, tim, XP hay lời nhắc hằng ngày. Vườn chỉ ghi nhận những gì đã bén rễ.</p></article><article className="paper-card"><Languages size={22} /><h2>Trung thực về giọng</h2><p>Chữ viết giữ nguyên chuẩn toàn quốc. Lớp giọng miền Trung xuất hiện trong phát âm và từ vựng, luôn kèm nhãn nguồn.</p></article><article className="paper-card"><BookOpenText size={22} /><h2>Văn bản thật</h2><p>Đồng dao, ca dao và tài liệu mở được làm dễ đọc bằng ranh giới từ, nghĩa và chú giải—not bằng câu giả lập.</p></article></div>
      <section className="about-note paper-card"><h2>Vì sao là “con heo”?</h2><p><strong>Con</strong> là loại từ dành cho động vật. <strong>Heo</strong> là cách nói tự nhiên ở miền Trung và miền Nam, nơi Hà Nội thường nói <em>lợn</em>. Tên ứng dụng đã là bài học đầu tiên.</p></section>
      <p className="build-note">Bản thử nghiệm địa phương · Nội dung mẫu thuộc phạm vi công cộng</p>
    </main>
  );
}

function Toast({ message }: { message: string }) { return <div className="toast" role="status"><Check size={17} />{message}</div>; }

export default function App({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const [view, setView] = useState<AppView>("home");
  const [story, setStory] = useState<Story>(STORIES[0]);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [words, setWords] = useState<WordRecord[]>([]);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [completedStories, setCompletedStories] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  const refresh = useCallback(async () => {
    const state = await api.state();
    setWords(state.words);
    setCards([...state.cards].sort((a, b) => b.updatedAt - a.updatedAt));
    setImports(state.imports);
    setCompletedStories(state.progress.filter((item) => item.completedAt).map((item) => item.storyId));
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("tch-theme") as ThemeMode | null;
    const initialHash = window.location.hash.replace("#", "") as AppView;
    // Reading progress now lives on the server, per account; only the theme is local.
    const restore = window.setTimeout(() => {
      if (storedTheme) setTheme(storedTheme);
      if (initialHash.startsWith("read/")) {
        const linkedStory = STORIES.find((item) => item.id === initialHash.slice(5));
        if (linkedStory) { setStory(linkedStory); setView("reader"); }
      } else if (["home", "review", "tones", "garden", "words", "import", "about"].includes(initialHash)) setView(initialHash);
      void refresh();
    }, 0);
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) void navigator.serviceWorker.register(new URL("sw.js", document.baseURI).pathname).catch(() => undefined);
    return () => window.clearTimeout(restore);
  }, [refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "system" ? "light dark" : theme;
    window.localStorage.setItem("tch-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => {
      const next = window.location.hash.replace("#", "") as AppView;
      if (next.startsWith("read/")) {
        const linkedStory = STORIES.find((item) => item.id === next.slice(5));
        if (linkedStory) { setStory(linkedStory); setView("reader"); }
      } else if (["home", "review", "tones", "garden", "words", "import", "about"].includes(next)) setView(next);
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => { window.removeEventListener("hashchange", onHash); window.removeEventListener("popstate", onHash); };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = (next: AppView) => {
    stopVietnamese();
    setView(next);
    if (next !== "reader") window.history.pushState(null, "", `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const read = (nextStory: Story) => { setStory(nextStory); setView("reader"); window.history.pushState(null, "", `#read/${nextStory.id}`); window.scrollTo(0, 0); };
  const statuses = useMemo(() => Object.fromEntries(words.map((word) => [word.entry, word.status])), [words]);
  const remember = async (token: Token, sentenceId: string) => { await api.rememberWord(token.entry, token.gloss, sentenceId); await refresh(); setToast(`Đã lưu “${token.entry}” để gặp lại.`); };
  const setStatus = async (entry: string, status: WordStatus) => {
    await api.setWordStatus(entry, status);
    await refresh(); setToast(status === "known" ? `“${entry}” đã bén rễ.` : `Đã cập nhật “${entry}”.`);
  };
  const completeStory = async (storyId: string) => {
    setCompletedStories((current) => (current.includes(storyId) ? current : [...current, storyId]));
    setToast("Bài đọc đã thêm một luống vào vườn.");
    const sentencesRead = STORIES.find((item) => item.id === storyId)?.sentences.map((item) => item.id) ?? [];
    await api.saveProgress(storyId, sentencesRead, Date.now());
  };
  const cycleTheme = () => setTheme((value) => value === "system" ? "light" : value === "light" ? "dark" : "system");

  return (
    <div className="app-shell">
      {view !== "reader" && <AppHeader currentView={view} onNavigate={navigate} theme={theme} onTheme={cycleTheme} username={user.username} onSignOut={onSignOut} />}
      {view === "home" && <HomeView onRead={read} onNavigate={navigate} knownCount={words.filter((word) => word.status === "known").length} completedStories={completedStories} />}
      {view === "reader" && <ReaderView story={story} statuses={statuses} onBack={() => navigate("home")} onRemember={remember} onStatus={setStatus} onComplete={() => completeStory(story.id)} />}
      {view === "tones" && <TonesView />}
      {view === "review" && <ReviewView cards={cards} onRefresh={refresh} />}
      {view === "garden" && <GardenView knownCount={words.filter((word) => word.status === "known").length} completed={completedStories.length} />}
      {view === "words" && <WordsView words={words} onStatus={setStatus} />}
      {view === "import" && <ImportView imports={imports} onSaved={refresh} />}
      {view === "about" && <AboutView />}
      {view !== "reader" && <BottomNav currentView={view} onNavigate={navigate} />}
      {toast && <Toast message={toast} />}
    </div>
  );
}
