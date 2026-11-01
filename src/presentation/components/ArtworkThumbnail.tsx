import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, iconSizes, spacing } from '@/constants/theme';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { resolverUriDaFoto } from '@/presentation/utils/fotos';
import { ActionButton } from './ActionButton';
import { AppIcon } from './AppIcon';

export function ArtworkThumbnail({ photoPath, testID }: { photoPath: string | null; testID?: string }) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState(false);
  const uri = resolverUriDaFoto(photoPath);

  if (!uri || uri === failedUri) {
    return <View style={styles.frame} accessible={false}>
      <AppIcon name="stock" color={colors.textSecondary} size={iconSizes.feature} />
    </View>;
  }

  return <>
    <Pressable testID={testID ? `${testID}-ampliar` : undefined} accessibilityRole="button"
      accessibilityLabel="Ampliar foto" style={styles.frame} onPress={() => setAmpliada(true)}>
      <Image key={uri} testID={testID} source={{ uri }} style={styles.image} contentFit="contain"
        accessible={false} onError={() => setFailedUri(uri)} />
    </Pressable>
    {ampliada ? (
      <Modal visible animationType="fade" onRequestClose={() => setAmpliada(false)}>
        <SafeAreaView style={styles.ampliada}>
          <Image testID="foto-ampliada" source={{ uri }} style={styles.imagemAmpliada} contentFit="contain"
            accessibilityLabel="Foto ampliada" />
          <ActionButton label="fechar-foto-ampliada" title="Fechar" icon="close" appearance="secondary"
            onPress={() => setAmpliada(false)} />
        </SafeAreaView>
      </Modal>
    ) : null}
  </>;
}

const useStyles = createThemedStyles((colors) => ({
  frame: { width: spacing.x4 * 4, height: spacing.x4 * 4, backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.control, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  ampliada: { flex: 1, padding: spacing.x4, gap: spacing.x4, backgroundColor: colors.background },
  imagemAmpliada: { flex: 1 },
}));
