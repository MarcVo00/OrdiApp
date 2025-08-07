import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { userContext } from './login';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { uid, email, role } = userContext;
  const router = useRouter();

  useEffect(() => {
    if (uid === null) {
      router.replace('/login');
    } else if (role === 'admin') {
      router.replace('/admin'); // ou '/produits' selon ta page admin principale
    } else if (role === 'serveur') {
      router.replace('/serveur');
    } else if (role === 'cuisine') {
      router.replace('/cuisine');
    }
  }, [uid, role]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
