"use client";

// Health integration settings storage
const HEALTH_SETTINGS_KEY = "weight-tracker-health-integrations";

export interface HealthIntegrationSettings {
  googleFit: {
    connected: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    lastSync?: string;
  };
  appleHealth: {
    // Apple Health is not available in web apps
    // This is just for showing the status
    available: boolean;
  };
  autoImport: {
    weight: boolean;
    steps: boolean;
  };
}

export const DEFAULT_HEALTH_SETTINGS: HealthIntegrationSettings = {
  googleFit: {
    connected: false,
  },
  appleHealth: {
    available: false,
  },
  autoImport: {
    weight: true,
    steps: true,
  },
};

// Google Fit OAuth configuration
// You need to set these in your .env.local file
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_REDIRECT_URI = typeof window !== "undefined"
  ? `${window.location.origin}/api/auth/google-fit/callback`
  : "";

// Google Fit API scopes
const GOOGLE_FIT_SCOPES = [
  "https://www.googleapis.com/auth/fitness.body.read",
  "https://www.googleapis.com/auth/fitness.activity.read",
].join(" ");

// Load settings from localStorage
export function loadHealthSettings(): HealthIntegrationSettings {
  if (typeof window === "undefined") return DEFAULT_HEALTH_SETTINGS;

  try {
    const saved = localStorage.getItem(HEALTH_SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_HEALTH_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_HEALTH_SETTINGS;
}

// Save settings to localStorage
export function saveHealthSettings(settings: HealthIntegrationSettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(HEALTH_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage not available
  }
}

// Check if Google Fit is configured
export function isGoogleFitConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID;
}

// Start Google Fit OAuth flow
export function startGoogleFitAuth(): void {
  if (!GOOGLE_CLIENT_ID) {
    console.error("Google Fit client ID not configured");
    return;
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_FIT_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  window.location.href = authUrl.toString();
}

// Disconnect Google Fit
export function disconnectGoogleFit(): void {
  const settings = loadHealthSettings();
  settings.googleFit = {
    connected: false,
  };
  saveHealthSettings(settings);
}

// Fetch weight data from Google Fit
export async function fetchGoogleFitWeight(
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<{ date: string; weight: number }[]> {
  const startTimeMillis = startDate.getTime();
  const endTimeMillis = endDate.getTime();

  const response = await fetch(
    `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [
          {
            dataTypeName: "com.google.weight",
          },
        ],
        bucketByTime: { durationMillis: 86400000 }, // 1 day
        startTimeMillis,
        endTimeMillis,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Google Fit data");
  }

  const data = await response.json();
  const weights: { date: string; weight: number }[] = [];

  for (const bucket of data.bucket || []) {
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        const timestamp = parseInt(point.startTimeNanos) / 1000000;
        const date = new Date(timestamp);
        const weight = point.value?.[0]?.fpVal;

        if (weight) {
          weights.push({
            date: date.toISOString().split("T")[0],
            weight: Math.round(weight * 10) / 10, // Round to 1 decimal
          });
        }
      }
    }
  }

  return weights;
}

// Fetch steps data from Google Fit
export async function fetchGoogleFitSteps(
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<{ date: string; steps: number }[]> {
  const startTimeMillis = startDate.getTime();
  const endTimeMillis = endDate.getTime();

  const response = await fetch(
    `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [
          {
            dataTypeName: "com.google.step_count.delta",
          },
        ],
        bucketByTime: { durationMillis: 86400000 }, // 1 day
        startTimeMillis,
        endTimeMillis,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Google Fit steps data");
  }

  const data = await response.json();
  const steps: { date: string; steps: number }[] = [];

  for (const bucket of data.bucket || []) {
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        const timestamp = parseInt(point.startTimeNanos) / 1000000;
        const date = new Date(timestamp);
        const stepCount = point.value?.[0]?.intVal;

        if (stepCount) {
          steps.push({
            date: date.toISOString().split("T")[0],
            steps: stepCount,
          });
        }
      }
    }
  }

  return steps;
}

// Check if running on iOS (for Apple Health availability info)
export function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Check if Apple Health is available (only in native apps)
export function isAppleHealthAvailable(): boolean {
  // Apple Health is never available in web apps
  // Would need React Native or native iOS app
  return false;
}

// Export types for components
export interface GoogleFitData {
  weights: { date: string; weight: number }[];
  steps: { date: string; steps: number }[];
}
