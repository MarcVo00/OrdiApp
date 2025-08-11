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
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async (firebaseUser?: FirebaseUser | null) => {
    try {
      const currentUser = firebaseUser || auth.currentUser;
      
      if (!currentUser) {
        setUser(null);
        return;
      }

      const userDoc = await getDoc(doc(db, 'utilisateurs', currentUser.uid));
      
      if (!userDoc.exists()) {
        setUser(null);
        return;
      }

      const userData = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        role: userDoc.data().role as UserRole,
        valide: userDoc.data().valide as boolean,
      };

      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      await refreshUser(firebaseUser);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
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