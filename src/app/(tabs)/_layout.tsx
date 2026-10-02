import { Drawer, DrawerContentScrollView, DrawerItemList } from 'expo-router/drawer';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadius, borderWidths, colors, fontSizes, layout, spacing, textStyles } from '@/constants/theme';
import { SairButton } from '@/presentation/components/SairButton';

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.drawerContent, { paddingBottom: insets.bottom + spacing.x4 }]}
    >
      <View style={styles.items}>
        <DrawerItemList {...props} />
      </View>
      <SairButton />
    </DrawerContentScrollView>
  );
}

export default function TabsLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: colors.text,
        drawerInactiveTintColor: colors.text,
        drawerActiveBackgroundColor: colors.selection,
        drawerInactiveBackgroundColor: colors.surface,
        drawerLabelStyle: { ...textStyles.label },
        drawerItemStyle: { borderRadius: borderRadius.control },
        drawerStyle: {
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
          borderRightWidth: borderWidths.control,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen
        name="kanban"
        options={{
          title: 'Pedidos',
          drawerLabel: 'Pedidos',
          drawerIcon: ({ color }) => (
            <SymbolView
              accessible={false}
              name={{ ios: 'list.bullet.rectangle', android: 'view_kanban', web: 'view_kanban' }}
              size={fontSizes.title}
              tintColor={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="estoque"
        options={{
          title: 'Estoque',
          drawerLabel: 'Estoque',
          drawerIcon: ({ color }) => (
            <SymbolView
              accessible={false}
              name={{ ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }}
              size={fontSizes.title}
              tintColor={color}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="eventos"
        options={{
          title: 'Eventos',
          drawerLabel: 'Eventos',
          drawerIcon: ({ color }) => (
            <SymbolView
              accessible={false}
              name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
              size={fontSizes.title}
              tintColor={color}
            />
          ),
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingTop: spacing.x4,
    paddingHorizontal: spacing.x3,
    gap: spacing.x4,
    minHeight: layout.minTouchTarget,
  },
  items: {
    flex: 1,
  },
});
