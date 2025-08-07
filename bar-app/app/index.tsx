import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { userContext } from './login';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Vérifier périodiquement le rôle car le contexte n'est pas réactif
    const interval = setInterval(() => {
      if (userContext.uid === null) {
        router.replace('/login');
      } else if (userContext.role === 'admin') {
        router.replace('/admin');
      } else if (userContext.role === 'serveur') {
        router.replace('/serveur');
      } else if (userContext.role === 'cuisine') {
        router.replace('/cuisine');
      }
    }, 500); // Vérifie toutes les 500ms

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}