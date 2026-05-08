import { createClient } from '@supabase/supabase-js';

// ─── Environment variables ────────────────────────────────────────────────────
// Copy .env.example → .env and fill in your Supabase project values.
// These are injected at build time by Vite; they are NEVER exposed in source.
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    '[Moja Lova] Missing Supabase credentials.\n' +
    'Copy .env.example → .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    'Run: cp .env.example .env'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password });

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signInGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

export const signOut = () => supabase.auth.signOut();

export const getUser = () => supabase.auth.getUser();

export const onAuthChange = (cb) =>
  supabase.auth.onAuthStateChange((_event, session) => cb(session));
