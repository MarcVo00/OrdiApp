// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'serveur' | 'cuisine' | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'admin',
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'serveur' | 'cuisine' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'utilisateurs', firebaseUser.email || firebaseUser.uid));
        const data = snap.data();

        if (data?.valide === false) {
          setRole(null);
          await signOut(auth);
          alert('Votre compte est en attente de validation par un administrateur.');
          return;
        }

        setRole(data?.role ?? null);
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    console.log('User logged in:', firebaseUser);

    setUser(firebaseUser);

    const snap = await getDoc(doc(db, 'utilisateurs', firebaseUser.email || firebaseUser.uid));
    const data = snap.data();

    if (data?.valide === false) {
      setRole(null);
      await signOut(auth);
      alert('Votre compte est en attente de validation par un administrateur.');
      return;
    }

    setRole(data?.role ?? null);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
