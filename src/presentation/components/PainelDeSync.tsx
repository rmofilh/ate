import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, spacing, textStyles } from '@/constants/theme';
import type { EstadoDoSync } from '@/main/sync/MotorDeSync';
import { useNetwork, useSync } from '@/presentation/hooks/AppProviders';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';

import { ActionButton } from './ActionButton';
import { AppIcon, type IconName } from './AppIcon';

function plural(n: number, singular: string, varias: string): string {
  return `${n} ${n === 1 ? singular : varias}`;
}

function descrever(estado: EstadoDoSync, online: boolean): { icone: IconName; texto: string; erro?: boolean } {
  const aguardando = plural(estado.pendentes, 'alteração aguardando envio', 'alterações aguardando envio');
  if (estado.sessaoExpirada) {
    return { icone: 'warning', texto: 'Sessão expirada. Saia e entre de novo para sincronizar.', erro: true };
  }
  if (!online) {
    return { icone: 'offline', texto: estado.pendentes ? `Sem conexão. ${aguardando}.` : 'Sem conexão.' };
  }
  if (estado.sincronizando) return { icone: 'sync', texto: 'Sincronizando...' };
  if (estado.falhas > 0) {
    return {
      icone: 'warning',
      texto: `${plural(estado.falhas, 'alteração recusada', 'alterações recusadas')} pelo servidor.`,
      erro: true,
    };
  }
  if (estado.pendentes > 0) return { icone: 'sync', texto: `${aguardando}.` };
  return { icone: 'cloudDone', texto: 'Tudo sincronizado.' };
}

/** Estado da sincronização no menu (RF17), com as ações de sincronizar e reenviar falhas. */
export function PainelDeSync() {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const { estado, sincronizarAgora, tentarDeNovo } = useSync();
  const { isOnline } = useNetwork();
  if (!estado) return null;
  const { icone, texto, erro } = descrever(estado, isOnline);
  return (
    <View testID="painel-sync" style={[styles.painel, erro && styles.painelErro]}>
      <View style={styles.linha} accessibilityLiveRegion="polite">
        <AppIcon name={icone} color={erro ? colors.error : colors.textSecondary} />
        <Text testID="painel-sync-texto" style={[styles.texto, erro && styles.textoErro]}>
          {texto}
        </Text>
      </View>
      {estado.falhas > 0 && isOnline ? (
        <ActionButton label="botao-tentar-de-novo" title="Tentar enviar de novo" icon="sync"
          appearance="secondary" disabled={estado.sincronizando}
          onPress={() => void tentarDeNovo()} />
      ) : null}
      <ActionButton label="botao-sincronizar" title="Sincronizar agora" icon="sync" appearance="quiet"
        disabled={!isOnline || estado.sincronizando} busy={estado.sincronizando}
        onPress={() => void sincronizarAgora()} />
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  painel: {
    gap: spacing.x2,
    padding: spacing.x3,
    borderRadius: borderRadius.control,
    backgroundColor: colors.surfaceSecondary,
  },
  painelErro: { backgroundColor: colors.errorSurface },
  linha: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2 },
  texto: { ...textStyles.body, color: colors.textSecondary, flexShrink: 1 },
  textoErro: { color: colors.error },
}));
