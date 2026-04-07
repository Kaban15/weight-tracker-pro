import { z } from "zod";

// Server-side env vars (only used in API routes — never imported client-side)
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_ADMIN_EMAILS: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  FEEDBACK_EMAIL: z.string().email().optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Call only in API routes (server-side). Validates and returns typed env. */
export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env);
}
