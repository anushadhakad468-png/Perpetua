'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  preferences: { currency: string; riskTolerance: string };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // FLOW B: Session Restoration
  useEffect(() => {
    const restoreSession = () => {
      const stored = localStorage.getItem('perpetua_session');
      if (stored) {
        setUser(JSON.parse(stored));
      }
      setIsLoading(false);
    };
    restoreSession();
  }, []);

  const signIn = async (email: string) => {
    // Demo Mode Authentication
    const mockUser = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: 'Demo User',
      email,
      preferences: { currency: 'USD', riskTolerance: 'Balanced' }
    };
    localStorage.setItem('perpetua_session', JSON.stringify(mockUser));
    setUser(mockUser);
    router.push('/overview');
  };

  const signOut = () => {
    localStorage.removeItem('perpetua_session');
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);