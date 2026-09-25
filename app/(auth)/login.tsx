import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../src/presentation/components/ActionButton';
import { useAuth } from '../../src/presentation/hooks/AppProviders';

export default function TelaLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <View>
      <Text accessibilityRole="header">Entrar no ate</Text>
      <Text>E-mail</Text>
      <TextInput
        accessibilityLabel="E-mail"
        testID="campo-email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text>Senha</Text>
      <TextInput
        accessibilityLabel="Senha"
        testID="campo-senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {erro ? <Text testID="erro-login">{erro}</Text> : null}
      <ActionButton
        label="botao-entrar"
        title={loading ? 'Entrando...' : 'Entrar'}
        onPress={() => void entrar()}
        disabled={loading}
      />
    </View>
  );
}
