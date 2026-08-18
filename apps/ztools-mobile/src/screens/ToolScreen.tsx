import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Tool'>;

export default function ToolScreen({ navigation, route }: Props) {
  const { name, bridgeUrl } = route.params;
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.bar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.webWrap}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.orange} />
          </View>
        ) : null}
        <WebView
          source={{ uri: bridgeUrl }}
          onLoadEnd={() => setLoading(false)}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          style={styles.web}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy950 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.navy950,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { paddingVertical: 6, paddingRight: 8 },
  backText: { color: '#d6dde8', fontWeight: '600', fontSize: 15 },
  title: {
    flex: 1,
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  webWrap: { flex: 1, backgroundColor: colors.gray100 },
  web: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
    zIndex: 2,
  },
});
