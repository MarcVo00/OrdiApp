import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    } else if (user.role) {
      switch(user.role) {
        case 'admin': router.replace('/admin'); break;
        case 'serveur': router.replace('/serveur'); break;
        case 'cuisine': router.replace('/cuisine'); break;
        default: router.replace('/login');
      }
    }
  }, [user]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}