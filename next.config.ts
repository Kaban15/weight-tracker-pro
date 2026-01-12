import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  // Suppress logs during build
  silent: true,

  // Upload source maps to Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from users
  hideSourceMaps: true,

  // Disable source map generation in dev
  disableServerWebpackPlugin: process.env.NODE_ENV !== "production",
  disableClientWebpackPlugin: process.env.NODE_ENV !== "production",
};

// Only wrap with Sentry in production or when SENTRY_DSN is set
const config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

export default config;
