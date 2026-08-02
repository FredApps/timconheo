import type { CapacitorConfig } from "@capacitor/cli";

// Words, cards and reading progress live on the server behind the login, so the
// app points the WebView at the live site rather than bundling a copy it could
// never keep in sync. Loading from https://ayrien.se means the origin -- and so
// the httpOnly session cookie -- is the same one the browser uses.
const config: CapacitorConfig = {
  appId: "se.ayrien.timconheo",
  appName: "Tìm Con Heo",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
    hostname: "ayrien.se",
    url: "https://ayrien.se/heo/",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#f3ecdf",
  },
  plugins: {
    TextToSpeech: {
      rate: 0.82,
      pitch: 1,
      volume: 1,
    },
  },
};

export default config;
