import React, { createContext, useState, useContext } from 'react';

interface AuthContextType {
  username: string | null;
  login: (username: string) => void;
  logout: () => void;
  setUsername: (username: string | null) => void;
  isLoggedIn: () => boolean;
}

// Create a custom error for context
const createAuthContextError = () => {
  throw new Error('useAuth must be used within an AuthProvider');
};

// Default context with error-throwing methods
const defaultAuthContext: AuthContextType = {
  username: null,
  login: createAuthContextError,
  logout: createAuthContextError,
  setUsername: createAuthContextError,
  isLoggedIn: () => false
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem('username') || null
  );

  const login = (user: string) => {
    setUsername(user);
    // Store username in localStorage for persistence
    localStorage.setItem('username', user);
  };

  const logout = () => {
    setUsername(null);
    // Clear all stored data
    localStorage.removeItem('username');
    localStorage.removeItem('doctorId');
    localStorage.removeItem('token');
  };
  
  const isLoggedIn = (): boolean => {
    // Check for stored username or doctorId
    return !!username || !!localStorage.getItem('username') || !!localStorage.getItem('doctorId');
  };

  return (
    <AuthContext.Provider value={{ 
      username, 
      login, 
      logout,
      setUsername,
      isLoggedIn
    }}>
      {children}
    </AuthContext.Provider> 
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Ensure the hook is used within AuthProvider
  if (context === defaultAuthContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};