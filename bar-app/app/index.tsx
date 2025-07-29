import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    } else if (role === 'admin') {
      router.replace('/admin'); // ou '/produits' selon ta page admin principale
    } else if (role === 'serveur') {
      router.replace('/serveur');
    } else if (role === 'cuisine') {
      router.replace('/cuisine');
    }
  }, [user, role]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
