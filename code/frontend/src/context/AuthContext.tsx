// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  role: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));

  const login = async (email: string, password: string) => {
    const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('role', response.data.user.role);
    setToken(response.data.token);
    setRole(response.data.user.role);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext) as AuthContextType;