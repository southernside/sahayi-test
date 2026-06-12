import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  onAuthChanged,
  signInWithGoogle,
  signOutUser,
  handleRedirectResult,
  requestNotificationPermission,
} from '@/lib/firebase';
import { api } from '@/lib/api';
import type { User } from '@sahayi/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  appUser: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    appUser: null,
    loading: true,
    error: null,
  });

  const syncUserWithBackend = useCallback(async (fbUser: FirebaseUser) => {
    try {
      // Request FCM token while we have the user
      const fcmToken = await requestNotificationPermission();

      const response = await api.post('/auth/login', { fcm_token: fcmToken });
      const { user } = response.data.data;
      setState((s) => ({ ...s, appUser: user, error: null }));
    } catch (err: any) {
      setState((s) => ({ ...s, error: 'Failed to sync user profile. Please try again.' }));
    }
  }, []);

  useEffect(() => {
    // Handle OAuth redirect result on page load
    handleRedirectResult().then((user) => {
      if (user) syncUserWithBackend(user);
    }).catch(console.error);

    const unsubscribe = onAuthChanged(async (fbUser) => {
      if (fbUser) {
        setState((s) => ({ ...s, firebaseUser: fbUser, loading: true }));
        await syncUserWithBackend(fbUser);
        setState((s) => ({ ...s, loading: false }));
      } else {
        setState({ firebaseUser: null, appUser: null, loading: false, error: null });
      }
    });

    return unsubscribe;
  }, [syncUserWithBackend]);

  const signIn = useCallback(async () => {
    setState((s) => ({ ...s, error: null }));
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.message === 'redirect_initiated') return;
      setState((s) => ({
        ...s,
        error: err.message || 'Sign in failed. Please try again.',
      }));
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
    setState({ firebaseUser: null, appUser: null, loading: false, error: null });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.firebaseUser) return;
    await syncUserWithBackend(state.firebaseUser);
  }, [state.firebaseUser, syncUserWithBackend]);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
