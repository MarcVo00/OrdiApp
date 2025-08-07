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
  const { user } = useAuth();
  
  if (!user || (user.role && !allowedRoles.includes(user.role))) {
    return null; // La redirection est gérée par index.tsx
  }

  return <>{children}</>;
}