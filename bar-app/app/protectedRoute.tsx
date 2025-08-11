import { useAuth } from './context/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: ('admin' | 'serveur' | 'cuisine')[];
  children: React.ReactNode;
}) {
  const { user, loading, initialCheckDone } = useAuth();
  const router = useRouter();

  useEffect(() => {
  if (!initialCheckDone || loading) return;

  if (!user) {
    router.replace('/login');
  } else if (!user.valide) {
    router.replace('/pending');
  } else if (user.role && !allowedRoles.includes(user.role)) {
    // Rediriger vers l'interface appropriée selon le rôle
    switch(user.role) {
      case 'admin': router.replace('/admin'); break;
      case 'serveur': router.replace('/serveur'); break;
      case 'cuisine': router.replace('/cuisine'); break;
      default: router.replace('/profile');
    }
  }
}, [user, loading, initialCheckDone, allowedRoles]);

  if (loading || !initialCheckDone) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user || !user.valide || (user.role && !allowedRoles.includes(user.role))) {
    return null; // La redirection est gérée par le useEffect
  }

  return <>{children}</>;
}