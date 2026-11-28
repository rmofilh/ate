import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { borderRadius, fontSizes, iconSizes, spacing, textStyles } from '@/constants/theme';
import type { SugestaoDeEndereco } from '@/core/application/gateways/IGeocodingGateway';
import { AppIcon } from '@/presentation/components/AppIcon';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';

/** Campo de endereço com sugestões ao digitar, dica discreta e oferta do endereço do pin. */
export function CampoDeEndereco({
  valor,
  onDigitar,
  sugestoes,
  onEscolher,
  enderecoDoPonto,
  onUsarEnderecoDoPonto,
  online,
  editavel = true,
}: {
  valor: string;
  onDigitar(texto: string): void;
  sugestoes: readonly SugestaoDeEndereco[];
  onEscolher(sugestao: SugestaoDeEndereco): void;
  enderecoDoPonto: string | null;
  onUsarEnderecoDoPonto(): void;
  online: boolean;
  editavel?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  return (
    <View style={styles.campo}>
      <TextInput
        accessibilityLabel="Endereço"
        testID="campo-endereco-evento"
        value={valor}
        onChangeText={onDigitar}
        editable={editavel}
        autoCorrect={false}
      />
      {sugestoes.length > 0 ? (
        <View testID="sugestoes-endereco" accessibilityRole="list" style={styles.lista}>
          {sugestoes.map((sugestao, indice) => (
            <Pressable
              key={`${sugestao.rotulo}-${indice}`}
              testID={`sugestao-endereco-${indice}`}
              accessibilityRole="button"
              accessibilityLabel={`Usar ${sugestao.rotulo}`}
              onPress={() => onEscolher(sugestao)}
              style={({ pressed }) => [styles.item, indice > 0 && styles.divisor, pressed && styles.pressionado]}
            >
              <AppIcon name="pin" size={iconSizes.small} color={colors.textSecondary} />
              <Text style={styles.rotulo}>{sugestao.rotulo}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {enderecoDoPonto ? (
        <Pressable
          testID="usar-endereco-do-ponto"
          accessibilityRole="button"
          accessibilityLabel={`Usar o endereço do ponto marcado: ${enderecoDoPonto}`}
          onPress={onUsarEnderecoDoPonto}
        >
          <Text style={styles.dica}>
            Endereço do ponto: {enderecoDoPonto} · <Text style={styles.link}>Usar este</Text>
          </Text>
        </Pressable>
      ) : (
        <Text testID="dica-endereco" style={styles.dica}>
          {online
            ? 'Digite e escolha uma sugestão para marcar o local no mapa.'
            : 'Sem internet: digite o endereço e marque o local pelo mapa ou pelo GPS.'}
        </Text>
      )}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  campo: { gap: spacing.x2 },
  lista: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.control,
    backgroundColor: colors.surface,
    overflow: 'hidden' as const,
  },
  item: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.x2,
    paddingHorizontal: spacing.x3,
    paddingVertical: spacing.x3,
    minHeight: 44,
  },
  divisor: { borderTopWidth: 1, borderTopColor: colors.border },
  pressionado: { backgroundColor: colors.selection },
  rotulo: { ...textStyles.body, color: colors.text, flexShrink: 1 },
  dica: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary },
  link: { color: colors.link, fontWeight: '600' as const },
}));
