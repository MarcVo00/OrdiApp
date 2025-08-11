// app/index.tsx
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace('/login');

    if (user.role === 'admin') router.replace('/admin');
    else if (user.role === 'serveur') router.replace('/serveur');
    else if (user.role === 'cuisine') router.replace('/cuisine');
    else router.replace('/login');
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
