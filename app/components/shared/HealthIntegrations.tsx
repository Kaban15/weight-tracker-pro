"use client";

import { useState, useEffect } from "react";
import { Activity, X, Link, Unlink, AlertCircle, CheckCircle, Smartphone, RefreshCw } from "lucide-react";
import {
  HealthIntegrationSettings,
  DEFAULT_HEALTH_SETTINGS,
  loadHealthSettings,
  saveHealthSettings,
  isGoogleFitConfigured,
  startGoogleFitAuth,
  disconnectGoogleFit,
  isIOSDevice,
} from "@/lib/healthIntegrations";

interface HealthIntegrationsProps {
  isOpen: boolean;
  onClose: () => void;
  onImportData?: (data: { weights: { date: string; weight: number }[]; steps: { date: string; steps: number }[] }) => void;
}

export default function HealthIntegrations({ isOpen, onClose, onImportData }: HealthIntegrationsProps) {
  const [settings, setSettings] = useState<HealthIntegrationSettings>(DEFAULT_HEALTH_SETTINGS);
  const [isIOS, setIsIOS] = useState(false);
  const [googleFitConfigured, setGoogleFitConfigured] = useState(false);

  useEffect(() => {
    setSettings(loadHealthSettings());
    setIsIOS(isIOSDevice());
    setGoogleFitConfigured(isGoogleFitConfigured());
  }, []);

  const handleConnectGoogleFit = () => {
    startGoogleFitAuth();
  };

  const handleDisconnectGoogleFit = () => {
    disconnectGoogleFit();
    setSettings(loadHealthSettings());
  };

  const handleAutoImportChange = (key: 'weight' | 'steps', value: boolean) => {
    const newSettings = {
      ...settings,
      autoImport: {
        ...settings.autoImport,
        [key]: value,
      },
    };
    setSettings(newSettings);
    saveHealthSettings(newSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Integracje zdrowotne
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Google Fit */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285F4" />
                  <path d="M2 17l10 5 10-5" stroke="#34A853" strokeWidth="2" />
                  <path d="M2 12l10 5 10-5" stroke="#FBBC04" strokeWidth="2" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white">Google Fit</h3>
                <p className="text-sm text-slate-400">
                  Importuj wagę i kroki z Google Fit
                </p>
              </div>
            </div>

            {!googleFitConfigured ? (
              <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 text-sm">
                      Integracja z Google Fit wymaga konfiguracji.
                    </p>
                    <p className="text-amber-300/70 text-xs mt-1">
                      Dodaj NEXT_PUBLIC_GOOGLE_CLIENT_ID do zmiennych środowiskowych.
                    </p>
                  </div>
                </div>
              </div>
            ) : settings.googleFit.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Połączono</span>
                  {settings.googleFit.lastSync && (
                    <span className="text-xs text-slate-500">
                      Ostatnia synchronizacja: {new Date(settings.googleFit.lastSync).toLocaleDateString('pl-PL')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {/* TODO: Implement manual sync */}}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Synchronizuj teraz
                  </button>
                  <button
                    onClick={handleDisconnectGoogleFit}
                    className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    <Unlink className="w-4 h-4" />
                    Rozłącz
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogleFit}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Link className="w-4 h-4" />
                Połącz z Google Fit
              </button>
            )}
          </div>

          <div className="border-t border-slate-700" />

          {/* Apple Health */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    fill="#FF2D55"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white">Apple Health</h3>
                <p className="text-sm text-slate-400">
                  {isIOS ? "Wymaga natywnej aplikacji iOS" : "Dostępne tylko na urządzeniach Apple"}
                </p>
              </div>
            </div>

            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Smartphone className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-300 text-sm">
                    Integracja z Apple Health nie jest dostępna w aplikacji webowej.
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    Możesz ręcznie wprowadzać dane z Apple Health do aplikacji.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {settings.googleFit.connected && (
            <>
              <div className="border-t border-slate-700" />

              {/* Auto import settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-white">Automatyczny import</h3>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Waga</span>
                  <button
                    onClick={() => handleAutoImportChange('weight', !settings.autoImport.weight)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.autoImport.weight ? 'bg-emerald-600' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.autoImport.weight ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Kroki</span>
                  <button
                    onClick={() => handleAutoImportChange('steps', !settings.autoImport.steps)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.autoImport.steps ? 'bg-emerald-600' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.autoImport.steps ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
