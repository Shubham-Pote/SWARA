import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  currentLanguage: string;
  level: number;
  xp: number;
  streak: number;
  languages: string[];
  joinDate?: string;

  bio?: string;
  location?: string;
  avatarUrl?: string;
}

interface RegisterData {
  
  email: string;
  password: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>; // Added this line
  logout: () => void;
  updateUser: (userData: User) => void;
  switchLanguage: (language: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      console.log('🔍 App start - Token exists:', !!storedToken);
      console.log('🔍 App start - User exists:', !!savedUser);
      
      if (storedToken && savedUser) {
        try {
          // Validate token with backend
          console.log('🔐 Validating token with backend...');
          const profileData = await authAPI.getProfile();
          
          if (profileData.success && profileData.user) {
            setUser(profileData.user);
            // Update localStorage with fresh user data
            localStorage.setItem('user', JSON.stringify(profileData.user));
            console.log('✅ Token validated, user restored:', profileData.user.displayName);
          } else {
            throw new Error('Invalid token response');
          }
        } catch (error) {
          console.error('❌ Token validation failed:', error);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    validateToken();
  }, []);

  const updateUser = (userData: User) => {
    console.log('🔄 Updating user data:', userData.displayName);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Register method using authAPI
  const register = async (userData: RegisterData) => {
    try {
      console.log('🔐 Register attempt for:', userData.email);
      
      const data = await authAPI.register(userData);

      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        console.log('✅ Registration successful');
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Login attempt for:', email);
      
      const data = await authAPI.login({ email, password });
      
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        console.log('✅ Login successful');
      } else {
        throw new Error(data.message || 'No token received');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = () => {
    console.log('🔓 Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const switchLanguage = async (language: string) => {
    try {
      console.log('🌍 Switching language to:', language);
      
      const data = await authAPI.switchLanguage(language);
      
      if (data.success && data.user) {
        updateUser(data.user);
        console.log('✅ Language switched successfully:', language);
      } else {
        throw new Error(data.message || 'Failed to switch language');
      }
    } catch (error: any) {
      console.error('❌ Switch language error:', error);
      throw new Error(error.message || 'Failed to switch language');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register, // Added this line
    logout,
    updateUser,
    switchLanguage,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};