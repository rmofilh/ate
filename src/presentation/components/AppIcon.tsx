import { SymbolView } from 'expo-symbols';
import React, { type ComponentProps } from 'react';
import { View, type ColorValue } from 'react-native';

import { iconSizes } from '@/constants/theme';
import { useDesignTheme } from '@/presentation/hooks/useDesignTheme';

const symbols = {
  menu: { ios: 'line.3.horizontal', android: 'menu', web: 'menu' },
  board: { ios: 'rectangle.split.3x1', android: 'view_kanban', web: 'view_kanban' },
  overview: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  todo: { ios: 'clock', android: 'schedule', web: 'schedule' },
  doing: { ios: 'hammer', android: 'construction', web: 'construction' },
  done: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  person: { ios: 'person.crop.circle', android: 'person', web: 'person' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  sale: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  location: { ios: 'location', android: 'my_location', web: 'my_location' },
  offline: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  forward: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  back: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  next: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  stock: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
  series: { ios: 'square.on.square', android: 'layers', web: 'layers' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
} satisfies Record<string, ComponentProps<typeof SymbolView>['name']>;

export type IconName = keyof typeof symbols;

export function AppIcon({ name, color, size = iconSizes.control }: {
  name: IconName;
  color?: ColorValue;
  size?: number;
}) {
  const { colors } = useDesignTheme();
  return <View accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden
    style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <SymbolView name={symbols[name]} tintColor={color ?? colors.text} size={size} accessible={false} />
  </View>;
}
