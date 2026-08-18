import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchToolsCatalog, type ZtoolsTool } from '../api/client';
import BrandHeader from '../components/BrandHeader';
import OfflineBanner from '../components/OfflineBanner';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import {
  formatCacheAge,
  loadCachedTools,
  saveCachedTools,
} from '../lib/cache';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

function toolIcon(icon: string | null) {
  const map: Record<string, string> = {
    quote: '📋',
    solar: '☀️',
    ups: '⚡',
    audit: '📊',
    battery: '🔋',
  };
  return map[icon || ''] || '🛠️';
}

function filterAssignedTools(catalog: ZtoolsTool[], slugs: string[]) {
  const allowed = new Set(slugs);
  return catalog.filter((tool) => allowed.has(tool.slug));
}

function publicToolUrl(tool: ZtoolsTool) {
  if (tool.url && /^https?:\/\//i.test(tool.url)) return tool.url;
  const path = tool.route_path?.trim();
  if (path && /^https?:\/\//i.test(path)) return path;
  if (path?.startsWith('/')) return `https://www.zigma-technologies.com${path}`;
  return `https://www.zigma-technologies.com/tools/${tool.slug}`;
}

export default function DashboardScreen({ navigation }: Props) {
  const { user, signOut, refresh } = useAuth();
  const { online } = useNetworkStatus();
  const [tools, setTools] = useState<ZtoolsTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cacheNote, setCacheNote] = useState('');

  const loadTools = useCallback(
    async (opts?: { preferCache?: boolean }) => {
      if (!user) return;

      if (opts?.preferCache) {
        const cached = await loadCachedTools();
        if (cached?.tools?.length) {
          setTools(filterAssignedTools(cached.tools, user.toolSlugs));
          setCacheNote(`Showing saved tools from ${formatCacheAge(cached.savedAt)}`);
        }
      }

      if (!online) {
        if (!opts?.preferCache) {
          const cached = await loadCachedTools();
          if (cached?.tools?.length) {
            setTools(filterAssignedTools(cached.tools, user.toolSlugs));
            setCacheNote(`Offline — saved ${formatCacheAge(cached.savedAt)}`);
            return;
          }
        }
        throw new Error('You are offline. Connect to the internet to load your tools.');
      }

      const { tools: catalog } = await fetchToolsCatalog();
      const assigned = filterAssignedTools(catalog, user.toolSlugs);
      setTools(assigned);
      await saveCachedTools(catalog);
      setCacheNote('');
    },
    [online, user]
  );

  useEffect(() => {
    (async () => {
      try {
        await loadTools({ preferCache: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load tools');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadTools]);

  async function onRefresh() {
    setRefreshing(true);
    setError('');
    try {
      await refresh();
      await loadTools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh');
    } finally {
      setRefreshing(false);
    }
  }

  async function openTool(tool: ZtoolsTool) {
    if (!online) {
      setError('An internet connection is required to open tools.');
      return;
    }
    setOpening(tool.slug);
    setError('');
    try {
      navigation.navigate('Tool', {
        slug: tool.slug,
        name: tool.name,
        bridgeUrl: publicToolUrl(tool),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open tool');
    } finally {
      setOpening(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.welcome}>Welcome, {user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.orange} />
        </View>
      ) : (
        <FlatList
          data={tools}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.hero}>
              <BrandHeader compact subtitle="Your engineering tools" />
              <Text style={styles.heroText}>Tap a tool to open it on zigma-technologies.com.</Text>
              {!online ? (
                <OfflineBanner
                  tone="warning"
                  message="You are offline. Saved tools are shown below; opening tools needs a connection."
                />
              ) : cacheNote ? (
                <OfflineBanner message={cacheNote} />
              ) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No tools assigned yet</Text>
              <Text style={styles.emptyText}>Contact your Zigma administrator for access.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => openTool(item)}
              disabled={opening === item.slug}
            >
              <Text style={styles.cardIcon}>{toolIcon(item.icon)}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
                <Text style={styles.cardCta}>
                  {opening === item.slug ? 'Opening…' : 'Open tool →'}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray100 },
  topBar: {
    backgroundColor: colors.navy950,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  welcome: { color: colors.white, fontWeight: '700', fontSize: 16 },
  email: { color: '#9fb0cb', fontSize: 12, marginTop: 2 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  signOutText: { color: '#d6dde8', fontWeight: '600', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  hero: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  heroText: {
    textAlign: 'center',
    color: colors.graphite500,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  cardIcon: { fontSize: 28, marginTop: 2 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.navy950, marginBottom: 4 },
  cardDesc: { color: colors.graphite500, lineHeight: 20, fontSize: 14 },
  cardCta: { color: colors.orange, fontWeight: '700', marginTop: 10, fontSize: 14 },
  empty: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: { fontWeight: '700', color: colors.navy950, marginBottom: 6 },
  emptyText: { color: colors.graphite500, textAlign: 'center', lineHeight: 20 },
});
