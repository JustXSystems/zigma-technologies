import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ZtoolsTool, ZtoolsUser } from '../api/client';

const CACHE_KEYS = {
  tools: 'ztools_cache_tools_v2',
  user: 'ztools_cache_user_v1',
} as const;

type CachedTools = {
  savedAt: number;
  tools: ZtoolsTool[];
};

type CachedUser = {
  savedAt: number;
  user: ZtoolsUser;
};

export async function saveCachedTools(tools: ZtoolsTool[]) {
  const payload: CachedTools = { savedAt: Date.now(), tools };
  await AsyncStorage.setItem(CACHE_KEYS.tools, JSON.stringify(payload));
}

export async function loadCachedTools() {
  const raw = await AsyncStorage.getItem(CACHE_KEYS.tools);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedTools;
  } catch {
    return null;
  }
}

export async function saveCachedUser(user: ZtoolsUser) {
  const payload: CachedUser = { savedAt: Date.now(), user };
  await AsyncStorage.setItem(CACHE_KEYS.user, JSON.stringify(payload));
}

export async function loadCachedUser() {
  const raw = await AsyncStorage.getItem(CACHE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedUser;
  } catch {
    return null;
  }
}

export async function clearOfflineCache() {
  await AsyncStorage.multiRemove([CACHE_KEYS.tools, CACHE_KEYS.user]);
}

export function formatCacheAge(savedAt: number) {
  const mins = Math.max(1, Math.round((Date.now() - savedAt) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours} hr ago`;
}
