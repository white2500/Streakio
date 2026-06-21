import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.streakio.app",
  appName: "Streakio",
  webDir: "dist/public",
  server: {
    url: "https://habit-tracker-monthly.replit.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#0A0A0A",
  },
};

export default config;
