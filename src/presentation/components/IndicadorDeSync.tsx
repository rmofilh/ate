import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, fontSizes, iconSizes, spacing, textStyles } from '@/constants/theme';
import type { StatusSync } from '@/core/domain/enums/StatusSync';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';

import { AppIcon } from './AppIcon';

/**
 * Selo discreto do estado de envio de um registro (RF17): nada quando já está no servidor;
 * "Aguardando envio" enquanto está só no aparelho; "Erro ao enviar" quando o servidor recusou.
 */
export function IndicadorDeSync({ status, testID }: { status: StatusSync; testID?: string }) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  if (status === 'SINCRONIZADO') return null;
  const erro = status === 'ERRO';
  const texto = erro ? 'Erro ao enviar' : 'Aguardando envio';
  return (
    <View
      testID={testID}
      accessibilityLabel={erro ? 'Erro ao enviar para o servidor' : 'Aguardando envio para o servidor'}
      style={[styles.selo, erro && styles.seloErro]}
    >
      <AppIcon
        name={erro ? 'warning' : 'sync'}
        size={iconSizes.small}
        color={erro ? colors.error : colors.textSecondary}
      />
      <Text style={[styles.texto, erro && styles.textoErro]}>{texto}</Text>
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
