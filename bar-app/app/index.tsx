import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading, initialCheckDone } = useAuth(); // Ajoutez initialCheckDone dans votre AuthContext

  useEffect(() => {
    // Ne rien faire tant que le chargement initial n'est pas terminé
    if (!initialCheckDone || loading) return;

    if (!user) {
      router.replace('/login');
    } else if (user.role) {
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
    } else {
      router.replace('/profile'); // Redirection vers le profil si l'utilisateur est connecté
    }
  }, [user, loading, initialCheckDone]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}