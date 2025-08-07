// context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../../firebase';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export type UserRole = 'admin' | 'serveur' | 'cuisine' | null;

type AppUser = {
  uid: string;
  email: string;
  role: UserRole;
} | null;

type AuthContextType = {
  user: AppUser;
  loading: boolean;
  setUser: (user: AppUser) => void;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUserData: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUserData = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'utilisateurs', currentUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
            role: userData.role as UserRole,
          });
        } else {
          // Si le document n'existe pas encore
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
            role: null,
          });
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await refreshUserData();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      setUser, 
      refreshUserData,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};