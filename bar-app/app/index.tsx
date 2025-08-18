// app/index.tsx
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // on attend l’état Firebase + Firestore

    if (!user) {
      router.replace('/login');
      return;
    }

    // user existe, on route selon le rôle
    if (user.role === 'admin') router.replace('/admin/settings'); 
    else if (user.role === 'serveur') router.replace('/serveur');
    else if (user.role === 'cuisine') router.replace('/cuisine');
    else router.replace('/login'); // sécurité si rôle manquant
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}