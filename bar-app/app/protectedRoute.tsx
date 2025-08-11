<<<<<<< HEAD
import { useAuth } from './context/AuthContext';
import { useRouter } from 'expo-router';
=======
>>>>>>> 344c5644fff6706a2088a6ed360f7d08f2ab9a9d
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: ('admin' | 'serveur' | 'cuisine')[];
  children: React.ReactNode;
}) {
<<<<<<< HEAD
  const { user } = useAuth();
  
  if (!user || (user.role && !allowedRoles.includes(user.role))) {
    return null; // La redirection est gérée par index.tsx
=======
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("ProtectedRoute timeout - redirecting to login");
        router.replace('/login');
      }
    }, 1000);

    if (loading) return;

    if (!user || !user.uid) {
      router.replace('/login');
      return;
    }

    if (!user.valide) {
      router.replace('/pending');
      return;
    }

    if (user.role && !allowedRoles.includes(user.role)) {
      switch (user.role) {
        case 'admin': router.replace('/admin'); break;
        case 'serveur': router.replace('/serveur'); break;
        case 'cuisine': router.replace('/cuisine'); break;
        default: logout();
      }
    }

    return () => clearTimeout(timeoutId);
  }, [user, loading, allowedRoles]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user || !user.valide || (user.role && !allowedRoles.includes(user.role))) {
    return null;
>>>>>>> 344c5644fff6706a2088a6ed360f7d08f2ab9a9d
  }

  return <>{children}</>;
}