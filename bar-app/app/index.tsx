import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else {
        switch(user.role) {
          case 'admin': 
            router.replace('/admin');
            break;
          case 'serveur': 
            router.replace('/serveur');
            break;
          case 'cuisine': 
            router.replace('/cuisine');
            break;
          default:
            router.replace('/profile'); // Page par défaut si rôle non défini
        }
      }
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}