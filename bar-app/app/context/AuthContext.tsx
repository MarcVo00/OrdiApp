// context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';

// Type pour notre utilisateur
export type AppUser = {
  uid: string;
  email: string;
  role: 'admin' | 'serveur' | 'cuisine' | null;
} | null;

// Type pour le contexte
type AuthContextType = {
  user: AppUser;
  setUser: (user: AppUser) => void;
  loading: boolean;
};

// Création du contexte avec des valeurs par défaut
const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  loading: true,
});

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Récupérer les infos supplémentaires de Firestore
          const userDoc = await getDoc(doc(db, 'utilisateurs', firebaseUser.uid));
          console.log("Utilisateur récupéré:", userDoc.data());
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: userDoc.exists() ? (userDoc.data().role as 'admin' | 'serveur' | 'cuisine') : null
          });
        } catch (error) {
          console.error("Erreur lors de la récupération des données utilisateur:", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: null
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personnalisé
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};