// app/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

export type Role = 'admin' | 'serveur' | 'cuisine';

export type AppUser = {
  uid: string;
  email: string;
  nom?: string;
  prenom?: string;
  role?: Role | null; // null tant que non défini
  valide?: boolean;    // validation admin requise
};

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean; // charge l’état Firebase OU le profil Firestore
  login: (email: string, password: string) => Promise<AppUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

async function fetchUserDoc(firebaseUser: FirebaseUser): Promise<AppUser | null> {
  const ref = doc(db, 'utilisateurs', firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<AppUser>;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    nom: (data as any)?.nom,
    prenom: (data as any)?.prenom,
    role: (data as any)?.role ?? null,
    valide: (data as any)?.valide ?? false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null);
          return;
        }
        const profile = await fetchUserDoc(fbUser);
        setUser(profile);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchUserDoc(cred.user);
      setUser(profile);
      if (!profile) {
        // Pas de document Firestore → déconnexion pour éviter état incohérent
        await signOut(auth);
        throw new Error("Votre compte est incomplet côté serveur. Contactez un administrateur.");
      }
      if (!profile.valide) {
        await signOut(auth);
        throw new Error("Votre compte n'a pas encore été validé par un administrateur.");
      }
      if (!profile.role) {
        await signOut(auth);
        throw new Error("Aucun rôle n'est attribué à votre compte.");
      }
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}