import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading, initialCheckDone } = useAuth(); // Ajoutez initialCheckDone dans votre AuthContext

  useEffect(() => {
    if (!initialCheckDone || loading) return;

    if (!user) {
      router.replace('/login');
    } else if (!user.valide) {
      router.replace('/pending');
    } else {
      // Laissez le ProtectedRoute gérer la redirection en fonction du rôle
      router.replace('/profile');
    }
  }, [user, loading, initialCheckDone]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}