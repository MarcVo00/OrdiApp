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
  }

  return <>{children}</>;
}