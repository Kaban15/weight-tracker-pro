"use client";

// Notification settings storage key
const NOTIFICATION_SETTINGS_KEY = "weight-tracker-notifications";

export interface NotificationSettings {
  enabled: boolean;
  reminderTime: string; // HH:MM format
  reminderDays: number[]; // 0-6 (Sunday-Saturday)
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderTime: "08:00",
  reminderDays: [1, 2, 3, 4, 5, 6, 0], // All days
};

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
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
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
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
    if (settings.enabled) {
      scheduleReminder(settings);
    } else {
      cancelScheduledReminders();
    }
  } catch {
    // localStorage not available
  }
}

// Show a notification
export function showNotification(title: string, options?: NotificationOptions): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  try {
    new Notification(title, {
      icon: "/icons/icon-192x192.svg",
      badge: "/icons/icon-192x192.svg",
      ...options,
    });
  } catch {
    // Notification failed
  }
}

// Schedule reminder using setTimeout (simple approach)
// In production, this would use Service Worker + Push API
let reminderTimeout: NodeJS.Timeout | null = null;

export function scheduleReminder(settings: NotificationSettings): void {
  cancelScheduledReminders();

  if (!settings.enabled || Notification.permission !== "granted") return;

  const checkAndSchedule = () => {
    const now = new Date();
    const timeParts = settings.reminderTime.split(":");
    if (timeParts.length !== 2) return;

    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    // Validate time values
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return;
    }

    // Check if today is a reminder day
    const today = now.getDay();
    if (!settings.reminderDays.includes(today)) {
      // Schedule check for tomorrow
      scheduleNextCheck();
      return;
    }

    // Calculate time until reminder
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    let delay = reminderTime.getTime() - now.getTime();

    // If reminder time has passed today, schedule for tomorrow
    if (delay < 0) {
      scheduleNextCheck();
      return;
    }

    // Schedule the notification
    reminderTimeout = setTimeout(() => {
      showNotification("Czas na ważenie!", {
        body: "Nie zapomnij zapisać dzisiejszej wagi w Weight Tracker Pro",
        tag: "daily-reminder",
        requireInteraction: true,
      });

      // Schedule for next day
      scheduleNextCheck();
    }, delay);
  };

  const scheduleNextCheck = () => {
    // Check again in 1 hour or at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 1, 0, 0);

    const delay = Math.min(
      tomorrow.getTime() - now.getTime(),
      60 * 60 * 1000 // 1 hour max
    );

    reminderTimeout = setTimeout(checkAndSchedule, delay);
  };

  checkAndSchedule();
}

export function cancelScheduledReminders(): void {
  if (reminderTimeout) {
    clearTimeout(reminderTimeout);
    reminderTimeout = null;
  }
}

// Initialize notifications on app load
export function initializeNotifications(): void {
  const settings = loadNotificationSettings();
  if (settings.enabled && Notification.permission === "granted") {
    scheduleReminder(settings);
  }
}
