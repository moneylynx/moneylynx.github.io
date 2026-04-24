import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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
