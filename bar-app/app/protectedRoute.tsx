// components/ProtectedRoute.tsx
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
  const { role, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    } else if (role && !allowedRoles.includes(role)) {
      // Redirige selon rôle
      if (role === 'cuisine') router.replace('/cuisine');
      else if (role === 'serveur') router.replace('/serveur');
      else router.replace('/');
    }
  }, [role, user]);

  if (!role) return <View><ActivityIndicator /></View>;

  return <>{children}</>;
}
