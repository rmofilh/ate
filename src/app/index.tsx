import { Redirect } from 'expo-router';
import { useAuth } from '@/presentation/hooks/AppProviders';

export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? '/(tabs)/kanban' : '/(auth)/login'} />;
}
