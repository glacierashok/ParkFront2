import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { User } from '../types';
import * as api from '../services/api';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebaseConfig';
import { signInWithPopup, OAuthProvider, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const AUTH_STORAGE_KEY = '@parkwalkjog_user';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (provider: 'apple' | 'google') => Promise<User>;
  logout: () => void;
  refreshUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsedUser = JSON.parse(stored) as User;
          setUser(parsedUser);
          api.setCurrentUserId(parsedUser.id);
        }
      } catch (e) {
        console.error('Failed to load user from storage', e);
      }
    };
    loadStoredUser();
  }, []);

  const saveUser = async (u: User | null) => {
    try {
      setUser(u);
      if (u) {
        api.setCurrentUserId(u.id);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
      } else {
        api.setCurrentUserId(null);
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save user session', e);
    }
  };

  const login = useCallback(async (provider: 'apple' | 'google') => {
    setIsLoading(true);
    try {
      let email: string | undefined = undefined;
      let name: string | undefined = undefined;
      let firebaseUid: string | undefined = undefined;

      if (provider === 'google') {
        if (Platform.OS === 'web') {
          const googleProvider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, googleProvider);
          email = result.user.email || undefined;
          name = result.user.displayName || undefined;
          firebaseUid = result.user.uid;
        } else {
          // Native Google Sign-In with Firebase would go here (using react-native-google-signin)
          // For now, this is a placeholder for native
          throw new Error('Native Google Login not yet configured with Firebase.');
        }
      } else if (provider === 'apple') {
        if (Platform.OS === 'web') {
          const appleProvider = new OAuthProvider('apple.com');
          appleProvider.addScope('email');
          appleProvider.addScope('name');
          const result = await signInWithPopup(auth, appleProvider);
          email = result.user.email || undefined;
          name = result.user.displayName || undefined;
          firebaseUid = result.user.uid;
        } else {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          
          if (credential.email) email = credential.email;
          if (credential.fullName) name = [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ');

          const appleProvider = new OAuthProvider('apple.com');
          const firebaseCredential = appleProvider.credential({
            idToken: credential.identityToken!,
          });

          const result = await signInWithCredential(auth, firebaseCredential);
          firebaseUid = result.user.uid;
          
          // If native Apple payload didn't give us the name/email (subsequent logins), Firebase might have it
          if (!email && result.user.email) email = result.user.email;
          if (!name && result.user.displayName) name = result.user.displayName;
        }
      }

      // We now pass the firebaseUid to the backend API to act as the primary key
      const loggedIn = await api.loginUser(provider, email, name, firebaseUid);
      await saveUser(loggedIn);
      return loggedIn;
    } catch (error: any) {
      console.error('An error occurred during login', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    auth.signOut().catch(console.error);
    saveUser(null);
  }, []);

  const refreshUser = useCallback((updated: User) => saveUser(updated), []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
