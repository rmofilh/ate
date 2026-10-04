import React, { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { borderRadius, fontSizes, layout, spacing, textStyles } from '@/constants/theme';
import { ActionButton } from '@/presentation/components/ActionButton';
import { BrandMark } from '@/presentation/components/BrandMark';
import { FormScreen } from '@/presentation/components/FormScreen';
import { IconButton } from '@/presentation/components/IconButton';
import { StyledTextInput } from '@/presentation/components/StyledTextInput';
import { useAuth } from '@/presentation/hooks/AppProviders';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';

export default function TelaLogin() {
  const styles = useStyles();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInput = useRef<TextInput>(null);

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

  return <FormScreen auth testID="scroll-login">
    <View style={styles.column}>
      <View style={styles.brand}>
        <BrandMark size={72} />
        <View style={styles.brandCopy}>
          <Text style={styles.wordmark}>ate</Text>
          <Text style={styles.muted}>Sua oficina, em harmonia.</Text>
        </View>
      </View>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text accessibilityRole="header" style={styles.title}>Entrar no ate</Text>
          <Text style={styles.muted}>Um espaço para cuidar das suas criações.</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <StyledTextInput accessibilityLabel="E-mail" testID="campo-email" value={email} onChangeText={setEmail}
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email"
            textContentType="username" returnKeyType="next" submitBehavior="submit"
            onSubmitEditing={() => passwordInput.current?.focus()} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.password}>
            <StyledTextInput ref={passwordInput} accessibilityLabel="Senha" testID="campo-senha"
              value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
              autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password"
              returnKeyType="go" onSubmitEditing={() => void entrar()} style={styles.passwordInput} />
            <IconButton label="mostrar-senha" title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              icon={showPassword ? 'eyeOff' : 'eye'} selected={showPassword} appearance="secondary"
              onPress={() => setShowPassword((current) => !current)} />
          </View>
        </View>
        {erro ? <Text testID="erro-login" accessibilityLiveRegion="polite" style={styles.error}>{erro}</Text> : null}
        <ActionButton label="botao-entrar" title={loading ? 'Entrando...' : 'Entrar'} icon="forward"
          onPress={() => void entrar()} disabled={loading} busy={loading} appearance="primary" />
      </View>
      <Text style={styles.signature}>Da ideia à obra.</Text>
    </View>
  </FormScreen>;
}

const useStyles = createThemedStyles((colors) => ({
  column: { width: '100%', maxWidth: layout.formMaxWidth, gap: spacing.x8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.x4 },
  brandCopy: { flex: 1 },
  wordmark: { ...textStyles.brand, fontSize: fontSizes.wordmark, color: colors.text },
  title: { ...textStyles.title, color: colors.text },
  muted: { ...textStyles.body, color: colors.textSecondary },
  form: { padding: spacing.x5, borderRadius: borderRadius.card, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.x6 },
  field: { gap: spacing.x2 },
  label: { ...textStyles.label, color: colors.text },
  password: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2 },
  passwordInput: { flex: 1, minWidth: 0 },
  error: { ...textStyles.body, color: colors.error },
  signature: { ...textStyles.body, textAlign: 'center', color: colors.textSecondary },
}));
