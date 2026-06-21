import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "streakio-notifications";

interface NotificationSettings {
  enabled: boolean;
  time: string;
  lastSentDate: string | null;
}

function loadSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, time: "09:00", lastSentDate: null };
}

function saveSettings(s: NotificationSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function scheduleNotification(time: string) {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

let scheduledTimer: ReturnType<typeof setTimeout> | null = null;

function fireDailyReminder(settings: NotificationSettings) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (settings.lastSentDate === todayStr()) return;

  new Notification("Streakio — daily check-in 🔥", {
    body: "Don't forget to track your habits today!",
    icon: "/app/icon-192.png",
    badge: "/app/icon-192.png",
    tag: "streakio-daily",
  });

  const updated = { ...settings, lastSentDate: todayStr() };
  saveSettings(updated);
}

function armTimer(settings: NotificationSettings, onFired: () => void) {
  if (scheduledTimer) clearTimeout(scheduledTimer);
  if (!settings.enabled || Notification.permission !== "granted") return;

  const delay = scheduleNotification(settings.time);
  scheduledTimer = setTimeout(() => {
    fireDailyReminder(settings);
    onFired();
  }, delay);
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied",
  );
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings);
  const [tick, setTick] = useState(0);

  const supported = "Notification" in window;

  useEffect(() => {
    if (!supported || !settings.enabled) return;
    armTimer(settings, () => setTick((t) => t + 1));
    return () => {
      if (scheduledTimer) clearTimeout(scheduledTimer);
    };
  }, [settings.enabled, settings.time, tick, supported]);

  const enable = useCallback(async () => {
    if (!supported) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return false;
    const next = { ...settings, enabled: true };
    saveSettings(next);
    setSettings(next);
    return true;
  }, [settings, supported]);

  const disable = useCallback(() => {
    if (scheduledTimer) clearTimeout(scheduledTimer);
    const next = { ...settings, enabled: false };
    saveSettings(next);
    setSettings(next);
  }, [settings]);

  const setTime = useCallback(
    (time: string) => {
      const next = { ...settings, time };
      saveSettings(next);
      setSettings(next);
    },
    [settings],
  );

  return { supported, permission, settings, enable, disable, setTime };
}
