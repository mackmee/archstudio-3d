import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;

  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initAuthListener: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,
  isConfigured: isSupabaseConfigured(),

  signIn: async (email, password) => {
    set({ error: null });
    if (!isSupabaseConfigured()) {
      const err = 'Supabase credentials are not configured in .env.local';
      set({ error: err });
      return { error: err };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ error: error.message });
        return { error: error.message };
      }

      set({
        user: data.user,
        session: data.session,
        error: null,
      });
      return {};
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown sign in error';
      set({ error: message });
      return { error: message };
    }
  },

  signUp: async (email, password, fullName) => {
    set({ error: null });
    if (!isSupabaseConfigured()) {
      const err = 'Supabase credentials are not configured in .env.local';
      set({ error: err });
      return { error: err };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        set({ error: error.message });
        return { error: error.message };
      }

      set({
        user: data.user,
        session: data.session,
        error: null,
      });
      return {};
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown sign up error';
      set({ error: message });
      return { error: message };
    }
  },

  signOut: async () => {
    set({ error: null });
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } finally {
      set({
        user: null,
        session: null,
      });
    }
  },

  clearError: () => set({ error: null }),

  initAuthListener: () => {
    if (!isSupabaseConfigured()) {
      set({ loading: false, isConfigured: false });
      return () => {};
    }

    // 1. Initial check for existing active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session) {
        set({
          user: session.user,
          session,
          loading: false,
        });
      } else {
        set({
          user: null,
          session: null,
          loading: false,
        });
      }
    }).catch(() => {
      set({ loading: false });
    });

    // 2. Realtime listener for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        user: session?.user ?? null,
        session: session ?? null,
        loading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  },
}));
