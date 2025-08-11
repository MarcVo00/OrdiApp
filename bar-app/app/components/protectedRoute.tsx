// app/components/ProtectedRoute.tsx
import { ReactNode, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export type Role = 'admin' | 'serveur' | 'cuisine';

const roleToHome: Record<Role, string> = {
  admin: '/admin',
  serveur: '/serveur',
  cuisine: '/cuisine',
};

export default function ProtectedRoute({ allowedRoles, children }: { allowedRoles?: Role[]; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // 1) Non connecté → login
    if (!user) {
      if (pathname !== '/login') router.replace('/login');
      return;
    }

    // 2) Compte non validé ou sans rôle → retour login (ou une page dédiée)
    if (user.valide === false || !user.role) {
      router.replace('/login');
      return;
    }

    // 3) Si roles requis et rôle non autorisé → rediriger vers sa home
    if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
      router.replace(roleToHome[user.role]);
    }
  }, [user, loading, pathname]);

  if (loading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}