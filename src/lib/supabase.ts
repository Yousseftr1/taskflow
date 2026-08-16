import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

/**
 * Reads a required environment variable, or fails with a message that tells
 * the developer exactly how to fix it.
 *
 * Secrets never live in the repository. Locally they come from `.env`
 * (git-ignored); in CI/CD they come from GitHub Actions secrets.
 */
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing environment variable ${name}.\n` +
        'Run `cp .env.example .env` and fill in your Supabase credentials.',
    );
  }

  return value;
}

export function createSupabaseClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
  });
}
