import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, fontSizes, iconSizes, spacing, textStyles } from '@/constants/theme';
import type { StatusSync } from '@/core/domain/enums/StatusSync';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';

import { AppIcon } from './AppIcon';

/**
 * Selo do card só quando o servidor recusou o registro (raro). Enquanto ele espera o envio, nada
 * aparece: a nuvem do menu já resume o estado, e a sincronização é automática.
 */
export function IndicadorDeSync({ status, testID }: { status: StatusSync; testID?: string }) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  if (status !== 'ERRO') return null;
  return (
    <View
      testID={testID}
      accessibilityLabel="Não enviado: o servidor recusou este registro"
      style={[styles.selo, styles.seloErro]}
    >
      <AppIcon name="warning" size={iconSizes.small} color={colors.error} />
      <Text style={[styles.texto, styles.textoErro]}>Não enviado</Text>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.x1,
    paddingHorizontal: spacing.x2,
    paddingVertical: spacing.x1,
    borderRadius: borderRadius.control,
    backgroundColor: colors.surfaceSecondary,
  },
  seloErro: { backgroundColor: colors.errorSurface },
  texto: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary },
  textoErro: { color: colors.error },
}));
