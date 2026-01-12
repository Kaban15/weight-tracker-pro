import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session replay (captures user sessions for debugging)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Debug mode (set to true for troubleshooting)
  debug: false,

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "atomicFindClose",
    // Network errors
    "Failed to fetch",
    "NetworkError",
    "Load failed",
    // User cancelled
    "AbortError",
    // Rate limiting
    "Zbyt wiele operacji",
  ],

  // Filter out sensitive data
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          // Remove any potential passwords or tokens
          const sensitiveKeys = ["password", "token", "key", "secret", "auth"];
          for (const key of sensitiveKeys) {
            if (breadcrumb.data[key]) {
              breadcrumb.data[key] = "[FILTERED]";
            }
          }
        }
        return breadcrumb;
      });
    }

    return event;
  },
});
