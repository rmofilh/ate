import React from 'react';
import { Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useUIStyles } from '@/presentation/styles/uiStyles';

const TITULO_BANCO = 'Não foi possível abrir seus dados';

/** Erro que impede o app de seguir: banco local (padrão) ou configuração do Supabase ausente. */
export function TelaErroBanco({
  mensagem,
  titulo = TITULO_BANCO,
}: {
  mensagem: string;
  titulo?: string;
}) {
  const uiStyles = useUIStyles();
  return (
    <View
      testID="tela-erro-banco"
      style={[uiStyles.screen, { justifyContent: 'center', padding: spacing.x6, gap: spacing.x3 }]}
    >
      <Text accessibilityRole="header" style={uiStyles.title}>{titulo}</Text>
      <Text style={uiStyles.error}>{mensagem}</Text>
      {titulo === TITULO_BANCO ? (
        <Text style={uiStyles.muted}>Feche e abra o app de novo. Se continuar, reinstale o app.</Text>
      ) : null}
    </View>
  );
}
