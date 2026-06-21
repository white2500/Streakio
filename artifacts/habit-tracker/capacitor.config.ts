import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.streakio.app",
  appName: "Streakio",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    allowNavigation: ["habit-tracker-monthly.replit.app"],
  },
  android: {
    backgroundColor: "#0A0A0A",
  },
};

export default config;
