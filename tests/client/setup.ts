import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * jsdom under this Node version does not expose a working `window.localStorage`,
 * and the language and theme preferences are read synchronously during the first
 * render. A tiny in-memory implementation is closer to the browser than a stub
 * that swallows writes, and it makes "the setting persists" testable.
 */
function installLocalStorage(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage && typeof window.localStorage.getItem === "function") return;
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(key, String(value)),
  };
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
}

installLocalStorage();

afterEach(() => {
  cleanup();
  globalThis.window?.localStorage?.clear();
});

// jsdom implements none of these, and the reader and tone lab call them on mount.
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    });
  }

  window.scrollTo = vi.fn();

  HTMLCanvasElement.prototype.getContext = () => null;

  // Speech synthesis and audio playback are not implemented either; the speech
  // tests install their own richer doubles over these.
  if (!("speechSynthesis" in window)) {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] },
    });
  }
}
