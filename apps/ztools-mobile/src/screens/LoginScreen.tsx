import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkApiHealth, login } from '../api/client';
import BrandHeader from '../components/BrandHeader';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { colors, radii, spacing } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  useEffect(() => {
    checkApiHealth()
      .then(() => setServerOk(true))
      .catch((err) => {
        setServerOk(false);
        setError(err instanceof Error ? err.message : 'Cannot reach server');
      });
  }, []);

  async function onSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const { token, user } = await login(email.trim(), password);
      await signIn(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <BrandHeader />
          <View style={styles.card}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.lead}>
              Access quotation, ROI, and engineering calculators assigned to your account.
            </Text>
            <View style={[styles.statusPill, serverOk ? styles.statusOk : styles.statusBad]}>
              <Text style={styles.statusText}>
                {serverOk === null
                  ? `Checking ${API_BASE_URL}…`
                  : serverOk
                    ? `Connected to ${API_BASE_URL}`
                    : `Cannot reach ${API_BASE_URL}`}
              </Text>
            </View>
            {serverOk === false ? (
              <Text style={styles.hint}>
                Start the website: npm run dev (repo root). Then restart the app with: npm run ztools:android:emu
              </Text>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={styles.input}
                placeholder="you@company.com"
                placeholderTextColor={colors.graphite500}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.graphite500}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
            <Text style={styles.foot}>
              New user? Register on the ZTools web portal and wait for admin approval.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray100 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.lg,
    shadowColor: '#0a1628',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy950,
    marginBottom: spacing.xs,
  },
  lead: {
    color: colors.graphite500,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  statusPill: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  statusOk: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusBad: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.graphite700,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.graphite500,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  field: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.graphite700,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.navy950,
    backgroundColor: '#fafbfd',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.orange,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  foot: {
    marginTop: spacing.md,
    textAlign: 'center',
    color: colors.graphite500,
    fontSize: 13,
    lineHeight: 20,
  },
});
