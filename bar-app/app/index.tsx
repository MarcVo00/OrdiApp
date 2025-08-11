import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Seulement pour le premier chargement de l'app
    if (loading) return;

    if (!user) {
      router.replace('/login');
    }
    // La navigation après login est gérée par ProtectedRoute
  }, [loading]); // Seulement basé sur le loading

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}