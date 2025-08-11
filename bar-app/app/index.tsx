import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading, resetUser } = useAuth();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("Timeout reached - redirecting to login");
        resetUser();
        router.replace('/login');
      }
    }, 1000);
    if (!loading && user) {
      if (!user.valide) {
        router.replace('/pending');
      } else {
        // Le ProtectedRoute gérera la redirection finale
        router.replace('/');
      }
    }

    return () => clearTimeout(timeoutId);
  }, [loading, resetUser, router]);
    // Seulement pour le premier chargement de l'app et enlever les informations de l'utilisateur
    // Si l'utilisateur est déjà connecté, on le redirige vers la page appropriée
    if (loading) return;
    
    if (user) {
      if (!user.valide) {
        router.replace('/pending');
        return;
      }
      
      switch (user.role) {
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
          router.replace('/login');
      }
      return;
    }

    // Si l'utilisateur n'est pas connecté, on le redirige vers la page de login
    router.replace('/login');


  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}