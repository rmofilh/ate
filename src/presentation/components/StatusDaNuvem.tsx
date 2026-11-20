import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { fontSizes, iconSizes, spacing, textStyles } from '@/constants/theme';
import type { EstadoDoSync } from '@/main/sync/MotorDeSync';
import { useNetwork, useSync } from '@/presentation/hooks/AppProviders';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';

import { AppIcon, type IconName } from './AppIcon';

interface Situacao {
  icone: IconName;
  texto: string;
  erro?: boolean;
}

export const TEXTO_SEM_CONEXAO = 'Sem conexão · salvo no aparelho';

function situacao(estado: EstadoDoSync | null, online: boolean): Situacao | null {
  if (estado?.sessaoExpirada) {
    return { icone: 'warning', texto: 'Entre de novo para sincronizar', erro: true };
  }
  if (!online) return { icone: 'cloudOff', texto: TEXTO_SEM_CONEXAO };
  if (!estado) return null;
  if (estado.falhas > 0) {
    return { icone: 'warning', texto: 'Algo não foi enviado · toque para tentar de novo', erro: true };
  }
  if (estado.sincronizando || estado.pendentes > 0) return { icone: 'sync', texto: 'Sincronizando…' };
  return { icone: 'cloudDone', texto: 'Tudo sincronizado' };
}

/**
 * Estado da nuvem numa linha discreta (RF17): a sincronização é automática e só aparece quando
 * precisa de atenção. Sem botão de sincronizar; no raro caso de recusa do servidor, a própria
 * linha vira o "tentar de novo".
 */
export function StatusDaNuvem() {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const { estado, tentarDeNovo } = useSync();
  const { isOnline } = useNetwork();
  const atual = situacao(estado, isOnline);
  if (!atual) return null;

  const conteudo = (
    <View style={styles.linha}>
      <AppIcon
        name={atual.icone}
        size={iconSizes.small}
        color={atual.erro ? colors.error : colors.textSecondary}
      />
      <Text testID="status-nuvem-texto" style={[styles.texto, atual.erro && styles.textoErro]}>
        {atual.texto}
      </Text>
    </View>
  );

  if (atual.erro && estado && estado.falhas > 0 && isOnline) {
    return (
      <Pressable
        testID="status-nuvem"
        accessibilityRole="button"
        accessibilityLabel="Algo não foi enviado. Toque para tentar de novo"
        onPress={() => void tentarDeNovo()}
      >
        {conteudo}
      </Pressable>
    );
  }
  return (
    <View testID="status-nuvem" accessibilityLiveRegion="polite" accessibilityLabel={atual.texto}>
      {conteudo}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  linha: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.x2, paddingVertical: spacing.x1 },
  texto: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary, flexShrink: 1 },
  textoErro: { color: colors.error },
}));
