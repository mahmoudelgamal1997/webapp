import React, { createContext, useState, useContext } from 'react';

interface AuthContextType {
  username: string | null;
  login: (username: string) => void;
  logout: () => void;
  setUsername: (username: string | null) => void; // Add this line
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
  setUsername: createAuthContextError // Add this line
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string | null>(null);

  const login = (user: string) => {
    setUsername(user);
    // You might want to add token storage here
    localStorage.setItem('username', user);
  };

  const logout = () => {
    setUsername(null);
    // Clear any stored tokens or user data
    localStorage.removeItem('username');
  };

  return (
    <AuthContext.Provider value={{ 
      username, 
      login, 
      logout,
      setUsername // Include this in the provider value
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