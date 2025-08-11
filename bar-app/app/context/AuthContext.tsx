import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../../firebase';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

type UserRole = 'admin' | 'serveur' | 'cuisine' | null;

type AppUser = {
  uid: string;
  email: string;
  role: UserRole;
  valide: boolean;
} | null;

type AuthContextType = {
  user: AppUser;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: (firebaseUser?: FirebaseUser | null) => Promise<AppUser | undefined>;
  resetUser: () => void; // Nouvelle méthode
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => undefined,
  resetUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const resetUser = () => {
    setUser(null);
    setLoading(false);
  };

  const refreshUser = async (firebaseUser?: FirebaseUser | null) => {
    try {
      setLoading(true);
      const currentUser = firebaseUser || auth.currentUser;
      console.log("Refreshing user:", currentUser);
      
      if (!currentUser) {
        resetUser();
        return null;
      }

      // Force un délai minimal pour éviter les conflits
      await new Promise(resolve => setTimeout(resolve, 100));

      const userDoc = await getDoc(doc(db, 'utilisateurs', currentUser.uid));

      console.log("User document fetched:", userDoc.exists(), userDoc.data());
      
      if (!userDoc.exists()) {
        resetUser();
        return null;
      }

      const userData = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        role: userDoc.data().role,
        valide: userDoc.data().valide
      };

      // Vérification cruciale avant mise à jour
      if (!userData.uid) {
        throw new Error("Données utilisateur incomplètes");
      }

      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Erreur refreshUser:", error);
      resetUser();
      return null;
    } finally {
      setLoading(false);
    }
  };
  const logout = async () => {
    try {
      await signOut(auth);
      resetUser();
      router.replace('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Set timeout for 1000ms
      timeoutId = setTimeout(() => {
        if (loading) {
          console.log("Timeout reached - redirecting to login");
          resetUser();
          router.replace('/login');
        }
      }, 1000);

      await refreshUser(firebaseUser);
      clearTimeout(timeoutId);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, resetUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};