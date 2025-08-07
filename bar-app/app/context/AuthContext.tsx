/*// context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ReactNode } from 'react';

type User = {
  uid: string;
  email: string;
  role?: 'admin' | 'serveur' | 'cuisine' | null;
};
const AuthContext = createContext<User | null>(null);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const docSnap = await getDoc(doc(db, 'utilisateurs', firebaseUser.uid));
        
        // Conversion explicite pour email ('' si null)
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '', // Conversion de null vers string vide
          role: docSnap.exists() ? docSnap.data().role : null
        });
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  // ... reste du code

return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  return useContext(AuthContext);
}
*/