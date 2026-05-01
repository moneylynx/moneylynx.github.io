import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

// ─── useSupabaseAuth ──────────────────────────────────────────────────────────
// Resolves the current Supabase session on mount and subscribes to auth state
// changes (login, logout, token refresh).
//
// Returns:
//   supaUser   — the authenticated Supabase User object, or null
//   setSupaUser — allows App to set the user after successful login
//   authReady  — true once the initial session check has resolved
//                (prevents a white flash while auth state is unknown)
// ─────────────────────────────────────────────────────────────────────────────
export function useSupabaseAuth() {
  const [supaUser, setSupaUser]   = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Resolve current session synchronously before the first paint.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupaUser(session?.user ?? null);
      setAuthReady(true);
    });

    // Subscribe to subsequent auth changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupaUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { supaUser, setSupaUser, authReady };
}
