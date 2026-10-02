import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderWidths, colors, fontSizes, fontWeights, layout, spacing, textStyles } from '@/constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { ...textStyles.heading, fontWeight: fontWeights.regular },
      headerShadowVisible: false,
      sceneStyle: { backgroundColor: colors.background },
      tabBarActiveTintColor: colors.text,
      tabBarInactiveTintColor: colors.text,
      tabBarActiveBackgroundColor: colors.selection,
      tabBarInactiveBackgroundColor: colors.surface,
      tabBarLabelStyle: { ...textStyles.label, fontWeight: fontWeights.regular },
      tabBarItemStyle: { minHeight: layout.minTouchTarget },
      tabBarStyle: {
        height: layout.tabBarContentHeight + insets.bottom,
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: borderWidths.control,
        elevation: spacing.none,
        shadowOpacity: spacing.none,
      },
    }}>
      <Tabs.Screen name="kanban" options={{
        title: 'Pedidos',
        tabBarIcon: ({ color }) => <SymbolView accessible={false} name={{ ios: 'list.bullet.rectangle', android: 'view_kanban', web: 'view_kanban' }} size={fontSizes.title} tintColor={color} />,
      }} />
      <Tabs.Screen name="estoque" options={{
        title: 'Estoque',
        tabBarIcon: ({ color }) => <SymbolView accessible={false} name={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }} size={fontSizes.title} tintColor={color} />,
      }} />
      <Tabs.Screen name="eventos" options={{
        title: 'Eventos',
        tabBarIcon: ({ color }) => <SymbolView accessible={false} name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }} size={fontSizes.title} tintColor={color} />,
      }} />
    </Tabs>
  );
}
