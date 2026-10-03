import { Drawer, DrawerContentScrollView, DrawerItemList } from 'expo-router/drawer';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import React from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { borderRadius, fontSizes, layout, spacing, textStyles } from '@/constants/theme';
import { ActionButton } from '@/presentation/components/ActionButton';
import { AppIcon } from '@/presentation/components/AppIcon';
import { BrandMark } from '@/presentation/components/BrandMark';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { SairButton } from '@/presentation/components/SairButton';
import { useAppNavigation, useData, useNetwork } from '@/presentation/hooks/AppProviders';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const styles = useStyles();
  const { pedidos, obras, eventos } = useData();
  const { isOnline } = useNetwork();
  const navigation = useAppNavigation();
  function shortcut(action: () => void) {
    props.navigation.closeDrawer();
    action();
  }
  return <DrawerContentScrollView {...props} contentContainerStyle={styles.content}>
    <View style={styles.brand}>
      <BrandMark size={56} />
      <View style={styles.brandCopy}>
        <Text style={styles.wordmark}>ate</Text>
        <Text style={styles.muted}>Seu ateliê, em harmonia.</Text>
      </View>
    </View>
    <OfflineBanner isOnline={isOnline} />
    <Text style={styles.section}>ESPAÇO DE TRABALHO</Text>
    <DrawerItemList {...props} />
    <View style={styles.summary}>
      <View style={styles.numbers}>
        {[['Pedidos', pedidos.length], ['Obras', obras.length], ['Eventos', eventos.length]].map(([label, count]) =>
          <View key={label} style={styles.stat}>
            <Text style={styles.number}>{count}</Text><Text style={styles.muted}>{label}</Text>
          </View>)}
      </View>
    </View>
    <Text style={styles.section}>CRIAR</Text>
    <ActionButton label="drawer-novo-pedido" title="Novo pedido" icon="plus" appearance="quiet"
      onPress={() => shortcut(navigation.novoPedido)} style={styles.shortcut} />
    <ActionButton label="drawer-nova-obra" title="Nova obra" icon="stock" appearance="quiet"
      onPress={() => shortcut(navigation.novaObra)} style={styles.shortcut} />
    <ActionButton label="drawer-novo-evento" title="Novo evento" icon="calendar" appearance="quiet"
      onPress={() => shortcut(navigation.novoEvento)} style={styles.shortcut} />
    <View style={styles.footer}>
      <SairButton />
      <Text style={styles.signature}>Da ideia à obra.</Text>
    </View>
  </DrawerContentScrollView>;
}

export default function TabsLayout() {
  const { colors } = useDesignTheme();
  const { width } = useWindowDimensions();
  return <Drawer drawerContent={(props) => <CustomDrawerContent {...props} />} screenOptions={{
    headerShown: false,
    drawerActiveTintColor: colors.onSelection,
    drawerInactiveTintColor: colors.textSecondary,
    drawerActiveBackgroundColor: colors.selection,
    drawerInactiveBackgroundColor: colors.surface,
    drawerLabelStyle: { ...textStyles.label },
    drawerItemStyle: { borderRadius: borderRadius.control, minHeight: layout.minTouchTarget },
    drawerStyle: { backgroundColor: colors.surface, width: Math.min(width - layout.minTouchTarget, 360) },
    overlayColor: colors.scrim,
    swipeEdgeWidth: 16,
    sceneStyle: { backgroundColor: colors.background },
  }}>
    <Drawer.Screen name="kanban" options={{ title: 'Pedidos', drawerLabel: 'Pedidos',
      drawerIcon: ({ color }) => <AppIcon name="board" color={color} /> }} />
    <Drawer.Screen name="estoque" options={{ title: 'Estoque', drawerLabel: 'Estoque',
      drawerIcon: ({ color }) => <AppIcon name="stock" color={color} /> }} />
    <Drawer.Screen name="eventos" options={{ title: 'Eventos', drawerLabel: 'Eventos',
      drawerIcon: ({ color }) => <AppIcon name="pin" color={color} /> }} />
  </Drawer>;
}

const useStyles = createThemedStyles((colors) => ({
  content: { flexGrow: 1, paddingHorizontal: spacing.x4, gap: spacing.x2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.x3, paddingVertical: spacing.x4 },
  brandCopy: { flex: 1 },
  wordmark: { ...textStyles.brand, color: colors.text },
  muted: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary },
  section: { ...textStyles.label, color: colors.textSecondary, fontSize: fontSizes.eyebrow, letterSpacing: 1,
    marginTop: spacing.x4, marginBottom: spacing.x1 },
  summary: { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.card, padding: spacing.x4,
    gap: spacing.x4, marginTop: spacing.x4 },
  numbers: { flexDirection: 'row', gap: spacing.x2, flexWrap: 'wrap' },
  stat: { flexGrow: 1, gap: spacing.x1 },
  number: { ...textStyles.title, color: colors.text },
  shortcut: { justifyContent: 'flex-start' },
  footer: { marginTop: 'auto', paddingTop: spacing.x4, gap: spacing.x4 },
  signature: { ...textStyles.body, color: colors.textSecondary, textAlign: 'center' },
}));
