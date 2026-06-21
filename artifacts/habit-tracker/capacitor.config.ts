import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.streakio.app",
  appName: "Streakio",
  webDir: "dist/public",
  server: {
    url: "https://habit-tracker-monthly.replit.app",
    cleartext: false,
    allowNavigation: [
      "*.clerk.accounts.dev",
      "shining-kit-44.clerk.accounts.dev",
      "clerk.shining-kit-44.accounts.dev",
    ],
  },
  android: {
    backgroundColor: "#0A0A0A",
  },
};

export default config;
