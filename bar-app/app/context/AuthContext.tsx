import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  refreshUser: (firebaseUser?: FirebaseUser | null) => Promise<AppUser>;
  initialized: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => null,
  initialized: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const isMounted = useRef(true);

  const refreshUser = async (firebaseUser?: FirebaseUser | null) => {
    if (!isMounted.current) return null;

    try {
      setLoading(true);
      const currentUser = firebaseUser || auth.currentUser;
      
      if (!currentUser) {
        setUser(null);
        return null;
      }

      const userDoc = await getDoc(doc(db, 'utilisateurs', currentUser.uid));
      
      if (!userDoc.exists()) {
        setUser(null);
        return null;
      }

      const userData = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        role: userDoc.data().role as UserRole,
        valide: userDoc.data().valide as boolean,
      };

      if (isMounted.current) {
        setUser(userData);
      }
      return userData;
    } catch (error) {
      console.error("Error refreshing user:", error);
      if (isMounted.current) {
        setUser(null);
      }
      return null;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      if (isMounted.current) {
        setUser(null);
      }
      router.replace('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    let unsubscribe: () => void;

    const initializeAuth = async () => {
      try {
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!isMounted.current) return;
          
          await refreshUser(firebaseUser);
          if (isMounted.current) {
            setInitialized(true);
          }
        });
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (isMounted.current) {
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted.current = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      logout, 
      refreshUser,
      initialized
    }}>
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