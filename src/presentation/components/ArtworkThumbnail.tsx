import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View } from 'react-native';

import { borderRadius, iconSizes, spacing } from '@/constants/theme';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { AppIcon } from './AppIcon';

export function ArtworkThumbnail({ photoPath }: { photoPath: string | null }) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const [failedPath, setFailedPath] = useState<string | null>(null);
  return <View style={styles.frame} accessible={false}>
    <AppIcon name="stock" color={colors.textSecondary} size={iconSizes.feature} />
    {photoPath && photoPath !== failedPath ? <Image key={photoPath} source={{ uri: photoPath }} style={styles.image} contentFit="cover"
      accessible={false} onError={() => setFailedPath(photoPath)} /> : null}
  </View>;
}

const useStyles = createThemedStyles((colors) => ({
  frame: { width: spacing.x4 * 4, height: spacing.x4 * 4, backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.control, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
}));
