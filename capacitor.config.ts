import type { CapacitorConfig } from "@capacitor/cli";

// v0.7 bundles the UI and learning corpus so Android can cold-start in airplane
// mode. API traffic uses CapacitorHttp and the offline outbox in app/lib/api.ts.
const config: CapacitorConfig = {
  appId: "se.ayrien.timconheo",
  appName: "Tìm Con Heo",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
    hostname: "localhost",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#f3ecdf",
  },
  plugins: {
    CapacitorCookies: { enabled: true },
    CapacitorHttp: { enabled: true },
    TextToSpeech: {
      rate: 0.82,
      pitch: 1,
      volume: 1,
    },
  },
};

export default config;
