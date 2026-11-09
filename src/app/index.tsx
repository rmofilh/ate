import { Redirect } from 'expo-router';

import { TelaCarregando } from '@/presentation/components/TelaCarregando';
import { useAuth } from '@/presentation/hooks/AppProviders';

export default function Index() {
  const { session, restaurando } = useAuth();
  // Enquanto a sessão guardada é lida, não manda para o login (evita piscar a tela de login).
  if (restaurando) return <TelaCarregando />;
  return <Redirect href={session ? '/(tabs)/kanban' : '/(auth)/login'} />;
}
