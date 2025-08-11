import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading, initialCheckDone } = useAuth();

  useEffect(() => {
    if (!initialCheckDone || loading) return;
    
    // Seulement pour le premier chargement de l'app
    if (!user) {
      router.replace('/login');
    } else {
      // Laisser le ProtectedRoute gérer la suite
      router.replace('/profile');
    }
  }, []); // Supprimez les dépendances pour que cela ne s'exécute qu'une fois

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}