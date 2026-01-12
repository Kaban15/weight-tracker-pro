"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Volume2, VolumeX, Vibrate, TestTube, X } from "lucide-react";
import {
  NotificationSettings as NotificationSettingsType,
  DEFAULT_SETTINGS,
  DAY_NAMES,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  loadNotificationSettings,
  saveNotificationSettings,
  sendTestNotification,
} from "@/lib/notifications";

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsType>(DEFAULT_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
    setSettings(loadNotificationSettings());
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  const handleSettingChange = (key: keyof NotificationSettingsType, value: unknown) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const toggleDay = (type: 'weight' | 'habits', day: number) => {
    const key = type === 'weight' ? 'weightDays' : 'habitsDays';
    const currentDays = settings[key];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    handleSettingChange(key, newDays);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Powiadomienia
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Permission status */}
          {!isSupported ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
              Twoja przeglądarka nie wspiera powiadomień.
            </div>
          ) : permission === "denied" ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
              Powiadomienia zostały zablokowane. Zmień ustawienia w przeglądarce, aby je włączyć.
            </div>
          ) : permission === "default" ? (
            <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4">
              <p className="text-amber-300 mb-3">
                Aby otrzymywać przypomnienia, musisz zezwolić na powiadomienia.
              </p>
              <button
                onClick={handleRequestPermission}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Zezwól na powiadomienia
              </button>
            </div>
          ) : null}

          {/* Weight reminders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.weightEnabled ? (
                  <Bell className="w-5 h-5 text-emerald-400" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-500" />
                )}
                <span className="font-medium text-white">Przypomnienie o ważeniu</span>
              </div>
              <button
                onClick={() => handleSettingChange('weightEnabled', !settings.weightEnabled)}
                disabled={permission !== "granted"}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.weightEnabled ? 'bg-emerald-600' : 'bg-slate-600'
                } ${permission !== "granted" ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.weightEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.weightEnabled && (
              <div className="pl-7 space-y-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Godzina</label>
                  <input
                    type="time"
                    value={settings.weightTime}
                    onChange={(e) => handleSettingChange('weightTime', e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Dni tygodnia</label>
                  <div className="flex gap-1">
                    {DAY_NAMES.map((name, index) => (
                      <button
                        key={index}
                        onClick={() => toggleDay('weight', index)}
                        className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                          settings.weightDays.includes(index)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => sendTestNotification('weight')}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  Wyślij testowe powiadomienie
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-700" />

          {/* Habits reminders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.habitsEnabled ? (
                  <Bell className="w-5 h-5 text-amber-400" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-500" />
                )}
                <span className="font-medium text-white">Przypomnienie o nawykach</span>
              </div>
              <button
                onClick={() => handleSettingChange('habitsEnabled', !settings.habitsEnabled)}
                disabled={permission !== "granted"}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.habitsEnabled ? 'bg-amber-600' : 'bg-slate-600'
                } ${permission !== "granted" ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.habitsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.habitsEnabled && (
              <div className="pl-7 space-y-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Godzina</label>
                  <input
                    type="time"
                    value={settings.habitsTime}
                    onChange={(e) => handleSettingChange('habitsTime', e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Dni tygodnia</label>
                  <div className="flex gap-1">
                    {DAY_NAMES.map((name, index) => (
                      <button
                        key={index}
                        onClick={() => toggleDay('habits', index)}
                        className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                          settings.habitsDays.includes(index)
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => sendTestNotification('habits')}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  Wyślij testowe powiadomienie
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-700" />

          {/* General settings */}
          <div className="space-y-4">
            <h3 className="font-medium text-white">Ustawienia ogólne</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-slate-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-500" />
                )}
                <span className="text-slate-300">Dźwięk</span>
              </div>
              <button
                onClick={() => handleSettingChange('soundEnabled', !settings.soundEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.soundEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vibrate className={`w-5 h-5 ${settings.vibrationEnabled ? 'text-slate-400' : 'text-slate-500'}`} />
                <span className="text-slate-300">Wibracje</span>
              </div>
              <button
                onClick={() => handleSettingChange('vibrationEnabled', !settings.vibrationEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.vibrationEnabled ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.vibrationEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
