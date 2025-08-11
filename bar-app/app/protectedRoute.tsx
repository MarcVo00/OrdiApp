import React from 'react';
import {useAuth} from './context/AuthContext';

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