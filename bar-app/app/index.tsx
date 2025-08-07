import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Index() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // Si pas d'utilisateur, rediriger vers login
      if (!user) {
        router.replace('/login');
        return;
      }

      // Si utilisateur mais sans rôle, vérifier dans Firestore
      if (user && user.uid && !user.role) {
        try {
          const docSnap = await getDoc(doc(db, 'utilisateurs', user.uid));
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const role = userData.role as 'admin' | 'serveur' | 'cuisine' | null;
            
            // Mettre à jour le contexte avec le rôle
            setUser({
              ...user,
              role
            });

            // Rediriger selon le rôle
            if (role === 'admin') router.replace('/admin');
            else if (role === 'serveur') router.replace('/serveur');
            else if (role === 'cuisine') router.replace('/cuisine');
            else router.replace('/login'); // Rôle non reconnu
          }
        } catch (error) {
          console.error("Erreur de vérification du rôle:", error);
          router.replace('/login');
        }
      } else if (user?.role) {
        // Rediriger si le rôle est déjà connu
        switch (user.role) {
          case 'admin': router.replace('/admin'); break;
          case 'serveur': router.replace('/serveur'); break;
          case 'cuisine': router.replace('/cuisine'); break;
          default: router.replace('/login');
        }
      }
    };

    checkUserAndRedirect();
  }, [user, setUser, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}