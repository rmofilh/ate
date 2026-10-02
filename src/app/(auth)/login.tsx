import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, borderWidths, colors, layout, spacing, textStyles } from '@/constants/theme';
import { ActionButton } from '@/presentation/components/ActionButton';
import { useAuth } from '@/presentation/hooks/AppProviders';

export default function TelaLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  async function entrar() {
    if (loading) return;

    setLoading(true);
    setErro(null);
    try {
      await login(email, password);
    } catch {
      setErro('E-mail ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text accessibilityRole="header" style={styles.title}>Entrar no ate</Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                accessibilityLabel="E-mail"
                testID="campo-email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                selectionColor={Platform.select({ android: colors.selection, default: colors.focus })}
                cursorColor={colors.focus}
                selectionHandleColor={colors.focus}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                accessibilityLabel="Senha"
                testID="campo-senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                selectionColor={Platform.select({ android: colors.selection, default: colors.focus })}
                cursorColor={colors.focus}
                selectionHandleColor={colors.focus}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>
          {erro ? <Text testID="erro-login" style={styles.error}>{erro}</Text> : null}
          <ActionButton
            label="botao-entrar"
            title={loading ? 'Entrando...' : 'Entrar'}
            onPress={() => void entrar()}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            textStyle={styles.buttonText}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.x6,
  },
  column: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
  },
  title: {
    ...textStyles.titleLarge,
    color: colors.text,
    marginBottom: spacing.x8,
  },
  form: {
    gap: spacing.x6,
  },
  field: {
    gap: spacing.x2,
  },
  label: {
    ...textStyles.label,
    color: colors.text,
  },
  input: {
    ...textStyles.body,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: spacing.x3,
    paddingVertical: spacing.x2,
    borderRadius: borderRadius.control,
    borderWidth: borderWidths.control,
    borderColor: colors.border,
    outlineWidth: spacing.none,
  },
  inputFocused: {
    borderWidth: borderWidths.focus,
    borderColor: colors.focus,
  },
  error: {
    ...textStyles.body,
    color: colors.error,
    marginTop: spacing.x6,
  },
  button: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.x2,
    marginTop: spacing.x8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.border,
    borderWidth: borderWidths.control,
    borderRadius: borderRadius.control,
  },
  buttonPressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceSecondary,
  },
  buttonText: {
    ...textStyles.label,
    color: colors.onPrimary,
  },
});
