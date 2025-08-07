// components/ProtectedRoute.tsx
import { useAuth, UserRole } from './context/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role && !allowedRoles.includes(user.role)) {
      // Redirige vers la page appropriée selon le rôle
      switch(user.role) {
        case 'admin': router.replace('/admin'); break;
        case 'serveur': router.replace('/serveur'); break;
        case 'cuisine': router.replace('/cuisine'); break;
        default: router.replace('/login');
      }
    }
  }, [user, loading]);

  if (loading || !user) {
    return <ActivityIndicator />;
  }

  return <>{children}</>;
}