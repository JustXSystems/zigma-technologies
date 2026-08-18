import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

type Props = {
  message: string;
  tone?: 'info' | 'warning';
};

export default function OfflineBanner({ message, tone = 'info' }: Props) {
  return (
    <View style={[styles.banner, tone === 'warning' && styles.bannerWarning]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#e8f1fb',
    borderColor: '#bfd7f5',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  bannerWarning: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  text: {
    color: colors.graphite700,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
