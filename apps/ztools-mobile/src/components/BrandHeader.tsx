import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type Props = {
  subtitle?: string;
  compact?: boolean;
};

export default function BrandHeader({ subtitle, compact = false }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.logoChip}>
        <Image
          source={require('../../assets/brand-mark.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.company}>Zigma Technologies</Text>
        <Text style={styles.product}>ZTools</Text>
        <Text style={styles.tag}>{subtitle || 'Engineering workspace'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  wrapCompact: {
    paddingVertical: spacing.md,
  },
  logoChip: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  logo: {
    width: 52,
    height: 52,
  },
  copy: {
    alignItems: 'center',
    gap: 2,
  },
  company: {
    color: colors.graphite700,
    fontSize: 14,
    fontWeight: '700',
  },
  product: {
    color: colors.orange,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tag: {
    color: colors.graphite500,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
