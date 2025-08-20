// app/components/ProtectedRoute.tsx
import { ReactNode, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export type Role = 'admin' | 'serveur' | 'cuisine';
const roleToHome: Record<Role, string> = { admin: '/admin/settings', serveur: '/serveur', cuisine: '/cuisine' };

export default function ProtectedRoute({ allowedRoles, children }: { allowedRoles?: Role[]; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (pathname !== '/login') router.replace('/login');
      return;
    }

    // 👉 compte non validé → /pending
    if (user.valide === false || !user.role) {
      if (pathname !== '/pending') router.replace('/pending');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
      router.replace(roleToHome[user.role as Role]);
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
