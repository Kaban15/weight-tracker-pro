"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Calendar, X } from "lucide-react";
import {
  NotificationSettings as Settings,
  DEFAULT_SETTINGS,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  loadNotificationSettings,
  saveNotificationSettings,
  showNotification,
} from "@/lib/notifications";

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = [
  { value: 1, label: "Pn" },
  { value: 2, label: "Wt" },
  { value: 3, label: "Śr" },
  { value: 4, label: "Cz" },
  { value: 5, label: "Pt" },
  { value: 6, label: "So" },
  { value: 0, label: "Nd" },
];

export default function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
    setSettings(loadNotificationSettings());
  }, []);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);

    if (result === "granted") {
      // Show test notification
      showNotification("Powiadomienia włączone!", {
        body: "Będziesz otrzymywać przypomnienia o ważeniu.",
      });
    }
  };

  const handleToggleEnabled = () => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const handleTimeChange = (time: string) => {
    const newSettings = { ...settings, reminderTime: time };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const handleDayToggle = (day: number) => {
    const newDays = settings.reminderDays.includes(day)
      ? settings.reminderDays.filter((d) => d !== day)
      : [...settings.reminderDays, day];

    const newSettings = { ...settings, reminderDays: newDays };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const handleTestNotification = () => {
    showNotification("Testowe powiadomienie", {
      body: "Tak będzie wyglądać przypomnienie o ważeniu!",
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border-2 border-emerald-500/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            Powiadomienia
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!isSupported ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400">
            <p className="text-sm">
              Twoja przeglądarka nie obsługuje powiadomień. Użyj nowoczesnej przeglądarki jak Chrome, Firefox lub Safari.
            </p>
          </div>
        ) : permission === "denied" ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
            <p className="text-sm">
              Powiadomienia zostały zablokowane. Aby je włączyć, zmień ustawienia w przeglądarce.
            </p>
          </div>
        ) : permission !== "granted" ? (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <BellOff className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 mb-4">
                Zezwól na powiadomienia, aby otrzymywać przypomnienia o codziennym ważeniu.
              </p>
              <button
                onClick={handleRequestPermission}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
              >
                Włącz powiadomienia
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Przypomnienia</p>
                <p className="text-slate-400 text-sm">Codzienne przypomnienie o ważeniu</p>
              </div>
              <button
                onClick={handleToggleEnabled}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  settings.enabled ? "bg-emerald-600" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${
                    settings.enabled ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {settings.enabled && (
              <>
                {/* Time picker */}
                <div>
                  <label className="flex items-center gap-2 text-slate-300 mb-2 font-medium">
                    <Clock className="w-4 h-4" />
                    Godzina przypomnienia
                  </label>
                  <input
                    type="time"
                    value={settings.reminderTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border-2 border-slate-700 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Days selector */}
                <div>
                  <label className="flex items-center gap-2 text-slate-300 mb-3 font-medium">
                    <Calendar className="w-4 h-4" />
                    Dni tygodnia
                  </label>
                  <div className="flex gap-2">
                    {DAYS.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => handleDayToggle(day.value)}
                        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                          settings.reminderDays.includes(day.value)
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Test button */}
                <button
                  onClick={handleTestNotification}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl transition-colors text-sm"
                >
                  Wyślij testowe powiadomienie
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
