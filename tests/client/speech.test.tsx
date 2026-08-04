import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpeechProvider, useSpeech } from "../../app/lib/speech";
import { isSpeechCancelled } from "../../app/lib/speech-control";
import { LangProvider } from "../../app/i18n";

/**
 * A controllable stand-in for HTMLAudioElement. Playback only finishes when the
 * test says so, which is what makes ordering and cancellation observable.
 */
const players: FakeAudio[] = [];
class FakeAudio {
  paused = false;
  readonly listeners = new Map<string, () => void>();
  constructor(readonly src: string) {
    players.push(this);
  }
  addEventListener(type: string, handler: () => void) {
    this.listeners.set(type, handler);
  }
  removeEventListener(type: string) {
    this.listeners.delete(type);
  }
  play() {
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  end() {
    this.listeners.get("ended")?.();
  }
}

function Harness({ onReady }: { onReady: (speech: ReturnType<typeof useSpeech>) => void }) {
  const speech = useSpeech();
  onReady(speech);
  return (
    <div>
      <span data-testid="phase">{speech.state.phase}</span>
      <span data-testid="provider">{speech.state.provider}</span>
      <span data-testid="offer">{String(speech.state.canUseDeviceNow)}</span>
      <button type="button" onClick={speech.useDeviceNow}>
        device now
      </button>
      <button type="button" onClick={speech.stop}>
        stop
      </button>
    </div>
  );
}

let speech: ReturnType<typeof useSpeech>;

function mount() {
  render(
    <LangProvider>
      <SpeechProvider>
        <Harness
          onReady={(value) => {
            speech = value;
          }}
        />
      </SpeechProvider>
    </LangProvider>,
  );
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let spoken: string[];
// Device utterances stay open until a test ends them, so "which provider is
// playing right now" is observable instead of a race against completion.
let openUtterances: SpeechSynthesisUtterance[];
const finishDeviceSpeech = () => {
  for (const utterance of openUtterances.splice(0)) {
    utterance.onend?.(new Event("end") as SpeechSynthesisEvent);
  }
};

beforeEach(() => {
  players.length = 0;
  spoken = [];
  openUtterances = [];
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(),
    getVoices: () => [{ lang: "vi-VN", name: "Vietnam" }],
    speak: (utterance: SpeechSynthesisUtterance) => {
      spoken.push(utterance.text);
      openUtterances.push(utterance);
    },
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      voice: unknown = null;
      lang = "";
      rate = 1;
      constructor(readonly text: string) {}
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("a ready response plays the Central voice and resolves when it finishes", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(jsonResponse({ status: "ready", audioUrls: ["/a.mp3"], voice: "myan" }))),
  );
  mount();

  let done = false;
  act(() => {
    void speech.speak("Con cò").then(() => (done = true));
  });

  await waitFor(() => expect(players).toHaveLength(1));
  expect(screen.getByTestId("provider")).toHaveTextContent("fpt");

  await act(async () => {
    players[0].end();
  });
  await waitFor(() => expect(done).toBe(true));
  expect(spoken).toEqual([]);
});

test("a pending job is polled until it is ready", async () => {
  let poll = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (String(url).endsWith("/api/tts")) {
        return Promise.resolve(
          jsonResponse({ status: "pending", requestId: "abc", retryAfterMs: 10, voice: "myan" }, 202),
        );
      }
      poll += 1;
      return Promise.resolve(
        poll < 2
          ? jsonResponse({ status: "pending", requestId: "abc", retryAfterMs: 10, voice: "myan" }, 202)
          : jsonResponse({ status: "ready", audioUrls: ["/a.mp3"], voice: "myan" }),
      );
    }),
  );
  mount();

  act(() => {
    void speech.speak("Con cò").catch(() => undefined);
  });
  expect(screen.getByTestId("phase")).toHaveTextContent("generating");

  await waitFor(() => expect(players).toHaveLength(1), { timeout: 2000 });
  expect(poll).toBeGreaterThanOrEqual(2);
});

test("the device voice is offered after five seconds and taken after twelve", async () => {
  // A job that never becomes ready.
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        jsonResponse({ status: "pending", requestId: "abc", retryAfterMs: 5000, voice: "myan" }, 202),
      ),
    ),
  );
  mount();

  act(() => {
    void speech.speak("Con cò").catch(() => undefined);
  });
  expect(screen.getByTestId("offer")).toHaveTextContent("false");

  await act(async () => {
    await vi.advanceTimersByTimeAsync(5100);
  });
  expect(screen.getByTestId("offer")).toHaveTextContent("true");
  expect(spoken).toEqual([]);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(7100);
  });
  await waitFor(() => expect(spoken).toEqual(["Con cò"]));
  expect(screen.getByTestId("provider")).toHaveTextContent("device");

  // And it settles back to idle once the device voice finishes.
  await act(async () => {
    finishDeviceSpeech();
  });
  await waitFor(() => expect(screen.getByTestId("phase")).toHaveTextContent("idle"));
});

test("a quota error falls back immediately rather than waiting out the timer", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        jsonResponse({ error: { code: "FPT_QUOTA", message: "Central speech is busy." } }, 503),
      ),
    ),
  );
  mount();

  act(() => {
    void speech.speak("Con cò").catch(() => undefined);
  });

  // No timer advance at all: the server already decided.
  await waitFor(() => expect(spoken).toEqual(["Con cò"]));
  expect(screen.getByTestId("provider")).toHaveTextContent("device");
});

test("pressing the offer switches to the device voice at once", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        jsonResponse({ status: "pending", requestId: "abc", retryAfterMs: 5000, voice: "myan" }, 202),
      ),
    ),
  );
  mount();

  act(() => {
    void speech.speak("Con cò").catch(() => undefined);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5100);
  });

  await userEvent.click(screen.getByRole("button", { name: "device now" }));
  await waitFor(() => expect(spoken).toEqual(["Con cò"]));
});

test("stopping rejects with a cancellation, so an ordered run does not advance", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(jsonResponse({ status: "ready", audioUrls: ["/a.mp3"], voice: "myan" }))),
  );
  mount();

  const played: string[] = [];
  let cancelled = false;
  act(() => {
    void (async () => {
      try {
        for (const line of ["one", "two", "three"]) {
          await speech.speak(line);
          played.push(line);
        }
      } catch (error) {
        cancelled = isSpeechCancelled(error);
      }
    })();
  });

  await waitFor(() => expect(players).toHaveLength(1));
  await act(async () => {
    players[0].end();
  });
  await waitFor(() => expect(played).toEqual(["one"]));

  await waitFor(() => expect(players).toHaveLength(2));
  act(() => {
    speech.stop();
  });

  await waitFor(() => expect(cancelled).toBe(true));
  // The third line must never start.
  expect(played).toEqual(["one"]);
  expect(players).toHaveLength(2);
  expect(players[1].paused).toBe(true);
});

test("stopping returns the badge to idle", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        jsonResponse({ status: "pending", requestId: "abc", retryAfterMs: 5000, voice: "myan" }, 202),
      ),
    ),
  );
  mount();

  act(() => {
    void speech.speak("Con cò").catch(() => undefined);
  });
  expect(screen.getByTestId("phase")).toHaveTextContent("generating");

  act(() => {
    speech.stop();
  });
  await waitFor(() => expect(screen.getByTestId("phase")).toHaveTextContent("idle"));
});

test("nothing is sent for empty text", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  mount();

  await act(async () => {
    await speech.speak("   ");
  });
  expect(fetcher).not.toHaveBeenCalled();
});

test("the cache check never contacts the speech provider", async () => {
  const fetcher = vi.fn(() => Promise.resolve(jsonResponse({ cached: [true, false] })));
  vi.stubGlobal("fetch", fetcher);
  mount();

  let result: boolean[] = [];
  await act(async () => {
    result = await speech.checkCached(["a", "b"]);
  });
  expect(result).toEqual([true, false]);
  expect(String((fetcher.mock.calls as unknown as Array<[unknown]>)[0]?.[0])).toBe("/heo/api/tts/cached");
});
