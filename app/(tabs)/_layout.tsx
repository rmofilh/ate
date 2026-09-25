import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="kanban" options={{ title: 'Pedidos' }} />
      <Tabs.Screen name="estoque" options={{ title: 'Estoque' }} />
      <Tabs.Screen name="eventos" options={{ title: 'Eventos' }} />
    </Tabs>
  );
}
