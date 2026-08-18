import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchSession, type ZtoolsUser } from '../api/client';
import { PUSH_TOKEN_KEY, TOKEN_KEY } from '../config';
import { clearOfflineCache, loadCachedUser, saveCachedUser } from '../lib/cache';

type AuthContextValue = {
  user: ZtoolsUser | null;
  token: string | null;
  signIn: (token: string, user: ZtoolsUser) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

async function syncPushRegistration(authToken: string) {
  const notifications = await import('../services/notifications');
  const expoPushToken = await notifications.getExpoPushToken();
  if (!expoPushToken) return;
  await notifications.registerPushToken(authToken, expoPushToken);
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, expoPushToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ZtoolsUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    const storedToken = token || (await SecureStore.getItemAsync(TOKEN_KEY));
    let pushToken: string | null = null;
    try {
      pushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    } catch {
      // ignore
    }
    if (storedToken) {
      try {
        const notifications = await import('../services/notifications');
        await notifications.unregisterPushToken(storedToken, pushToken);
      } catch {
        // ignore network errors during sign-out
      }
    }
    setUser(null);
    setToken(null);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    } catch {
      // ignore
    }
    await clearOfflineCache();
  }, [token]);

  const signIn = useCallback(async (nextToken: string, nextUser: ZtoolsUser) => {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    await saveCachedUser(nextUser);
    try {
      await syncPushRegistration(nextToken);
    } catch {
      // push registration is best-effort
    }
  }, []);

  const refresh = useCallback(async () => {
    const stored = await withTimeout(SecureStore.getItemAsync(TOKEN_KEY), 5_000);
    if (!stored) {
      setUser(null);
      setToken(null);
      return;
    }
    try {
      const { user: nextUser } = await fetchSession(stored);
      setToken(stored);
      setUser(nextUser);
      await saveCachedUser(nextUser);
      try {
        await syncPushRegistration(stored);
      } catch {
        // ignore push sync errors
      }
    } catch {
      const cached = await loadCachedUser();
      if (cached) {
        setToken(stored);
        setUser(cached.user);
        return;
      }
      await signOut();
    }
  }, [signOut]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const value = useMemo(
    () => ({ user, token, signIn, signOut, refresh }),
    [user, token, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
