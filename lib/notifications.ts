"use client";

// Notification settings storage key
const NOTIFICATION_SETTINGS_KEY = "weight-tracker-notifications-v2";

export interface NotificationSettings {
  // Weight reminders
  weightEnabled: boolean;
  weightTime: string; // HH:MM format
  weightDays: number[]; // 0-6 (Sunday-Saturday)

  // Habits reminders
  habitsEnabled: boolean;
  habitsTime: string; // HH:MM format
  habitsDays: number[]; // 0-6 (Sunday-Saturday)

  // General settings
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  weightEnabled: false,
  weightTime: "08:00",
  weightDays: [1, 2, 3, 4, 5, 6, 0], // All days

  habitsEnabled: false,
  habitsTime: "20:00",
  habitsDays: [1, 2, 3, 4, 5, 6, 0], // All days

  soundEnabled: true,
  vibrationEnabled: true,
};

export const DAY_NAMES = ["Nd", "Pn", "Wt", "Sr", "Cz", "Pt", "So"];

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

// Check if service worker is supported
export function isServiceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return "denied";
  }
}

// Load settings from localStorage
export function loadNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old settings format if needed
      if ('enabled' in parsed && !('weightEnabled' in parsed)) {
        return {
          ...DEFAULT_SETTINGS,
          weightEnabled: parsed.enabled,
          weightTime: parsed.reminderTime || DEFAULT_SETTINGS.weightTime,
          weightDays: parsed.reminderDays || DEFAULT_SETTINGS.weightDays,
        };
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));

    // Update scheduled notifications
    cancelScheduledReminders();
    if (settings.weightEnabled || settings.habitsEnabled) {
      scheduleAllReminders(settings);
    }
  } catch {
    // localStorage not available
  }
}

// Show a notification
export function showNotification(
  title: string,
  options?: NotificationOptions & { vibrate?: number[] }
): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  const settings = loadNotificationSettings();

  try {
    // Try using service worker for better reliability
    if (isServiceWorkerSupported() && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: {
          icon: "/icons/icon-192x192.svg",
          badge: "/icons/icon-192x192.svg",
          vibrate: settings.vibrationEnabled ? [100, 50, 100] : undefined,
          silent: !settings.soundEnabled,
          ...options,
        },
      });
    } else {
      // Fallback to direct notification
      new Notification(title, {
        icon: "/icons/icon-192x192.svg",
        badge: "/icons/icon-192x192.svg",
        silent: !settings.soundEnabled,
        ...options,
      });
    }
  } catch {
    // Notification failed
  }
}

// Scheduled reminders storage
let weightReminderTimeout: NodeJS.Timeout | null = null;
let habitsReminderTimeout: NodeJS.Timeout | null = null;

function scheduleReminder(
  type: 'weight' | 'habits',
  time: string,
  days: number[],
  enabled: boolean
): void {
  if (!enabled || Notification.permission !== "granted") return;

  const scheduleNext = () => {
    const now = new Date();
    const timeParts = time.split(":");
    if (timeParts.length !== 2) return;

    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return;
    }

    // Find next reminder time
    let targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);

    // If time has passed today, start checking from tomorrow
    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Find next valid day
    let daysChecked = 0;
    while (!days.includes(targetDate.getDay()) && daysChecked < 7) {
      targetDate.setDate(targetDate.getDate() + 1);
      daysChecked++;
    }

    if (daysChecked >= 7) return; // No valid days

    const delay = targetDate.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      if (type === 'weight') {
        showNotification("Czas na ważenie!", {
          body: "Nie zapomnij zapisać dzisiejszej wagi",
          tag: "weight-reminder",
          requireInteraction: true,
        });
      } else {
        showNotification("Sprawdź swoje nawyki!", {
          body: "Czy wykonałeś dziś wszystkie nawyki?",
          tag: "habits-reminder",
          requireInteraction: true,
        });
      }
      scheduleNext();
    }, delay);

    if (type === 'weight') {
      weightReminderTimeout = timeout;
    } else {
      habitsReminderTimeout = timeout;
    }
  };

  scheduleNext();
}

export function scheduleAllReminders(settings: NotificationSettings): void {
  scheduleReminder('weight', settings.weightTime, settings.weightDays, settings.weightEnabled);
  scheduleReminder('habits', settings.habitsTime, settings.habitsDays, settings.habitsEnabled);
}

export function cancelScheduledReminders(): void {
  if (weightReminderTimeout) {
    clearTimeout(weightReminderTimeout);
    weightReminderTimeout = null;
  }
  if (habitsReminderTimeout) {
    clearTimeout(habitsReminderTimeout);
    habitsReminderTimeout = null;
  }
}

// Initialize notifications on app load
export function initializeNotifications(): void {
  const settings = loadNotificationSettings();
  if ((settings.weightEnabled || settings.habitsEnabled) && Notification.permission === "granted") {
    scheduleAllReminders(settings);
  }
}

// Test notification
export function sendTestNotification(type: 'weight' | 'habits'): void {
  if (type === 'weight') {
    showNotification("Test: Ważenie", {
      body: "To jest testowe powiadomienie o ważeniu",
      tag: "test-weight",
    });
  } else {
    showNotification("Test: Nawyki", {
      body: "To jest testowe powiadomienie o nawykach",
      tag: "test-habits",
    });
  }
}
