import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "se.ayrien.timconheo",
  appName: "Tìm Con Heo",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
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
