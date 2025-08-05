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
  role: null,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'serveur' | 'cuisine' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser);
      setUser(firebaseUser);

      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'utilisateurs', firebaseUser.email || firebaseUser.uid));
        console.log('User document snapshot:', snap);
        const data = snap.data();

        if (data?.valide === false) {
          setRole(null);
          await signOut(auth);
          alert('Votre compte est en attente de validation par un administrateur.');
          return;
        }

        setRole(data?.role ?? null);
        console.log('User role set to:', data?.role);
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Logging in with email:', email);
    if (!email || !password) {
      throw new Error('Email and password must be provided');
    }
    console.log('Attempting to sign in with email and password');
    // Sign in the user with Firebase Authentication
    if (!auth) {
      throw new Error('Firebase auth is not initialized');
    }
    console.log('Firebase auth is initialized');
    
    
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
