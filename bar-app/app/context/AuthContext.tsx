import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../../firebase';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export type UserRole = 'admin' | 'serveur' | 'cuisine' | null;

type AppUser = {
  uid: string;
  email: string;
  role: UserRole;
  valide: boolean;
} | null;

type AuthContextType = {
  user: AppUser;
  loading: boolean;
  initialCheckDone: boolean;
  setUser: (user: AppUser) => void;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialCheckDone: false,
  setUser: () => {},
  refreshUserData: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const router = useRouter();

const refreshUserData = async (firebaseUser: FirebaseUser | null) => {
  try {
    if (firebaseUser) {
      const userDoc = await getDoc(doc(db, 'utilisateurs', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: userData.role || null,
          valide: userData.valide || false
        });
      } else {
        // Nouvel utilisateur sans document utilisateur
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: null,
          valide: false
        });
      }
    } else {
      setUser(null);
    }
  } catch (error) {
    console.error("Error refreshing user data:", error);
    setUser(null);
  } finally {
    setLoading(false);
    if (!initialCheckDone) setInitialCheckDone(true);
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
      await refreshUserData(firebaseUser);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user,
      loading,
      initialCheckDone,
      setUser,
      refreshUserData: () => refreshUserData(auth.currentUser),
      logout,
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