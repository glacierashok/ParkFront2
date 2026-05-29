import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { User } from '../types';
import * as api from '../services/api';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const login = useCallback(
    async (provider: 'apple' | 'google') => {
      setIsLoading(true);
      try {
        let email: string | undefined = undefined;
        let name: string | undefined = undefined;

        if (provider === 'google') {
          const result = await promptAsync();
          
          if (result?.type === 'success') {
            const token = result.authentication?.accessToken;
            if (token) {
              const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
                headers: { Authorization: `Bearer ${token}` },
              });
              const authUser = await userInfoResponse.json();
              if (authUser?.email) {
                email = authUser.email;
              }
              if (authUser?.name) {
                name = authUser.name;
              } else if (authUser?.given_name) {
                name = [authUser.given_name, authUser.family_name].filter(Boolean).join(' ');
              }
            } else {
              throw new Error('Google Sign-In failed to return an access token.');
            }
          } else {
            console.log('Login cancelled or failed', result);
            throw new Error('Login cancelled or failed');
          }
        } else if (provider === 'apple') {
          try {
            if (Platform.OS === 'web') {
              // Apple Sign In on Web requires configuring a Service ID, validating domains, and setting up redirect URIs.
              // For now, we bypass the native call on web to prevent it from crashing and use a mock identity.
              console.log('Web environment detected: bypassing native Apple login and using mock identity.');
              email = 'appleuser@example.com';
              name = 'Apple Web User';
            } else {
              const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                  AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                  AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
              });
              // Apple only provides email and full name on the first login of an app.
              if (credential.email) {
                email = credential.email;
              }
              if (credential.fullName) {
                name = [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ');
              }
              
              if (!email) {
                // We could prompt them, or let the backend assign a placeholder/lookup based on user id.
                // For now, we fallback to a default or undefined which API supports.
                console.log('Apple identity token received, but email not present (user likely already logged in before).');
              }
            }
            // in a serious app, you send credential.identityToken to backend to verify and extract the email/sub 
          } catch (e: any) {
            if (e.code === 'ERR_REQUEST_CANCELED') {
              console.log('Apple Login cancelled');
              throw new Error('Login cancelled');
            } else {
              console.error('Apple Login error', e);
              throw e;
            }
          }
        }

        // Pass it to the naive backend
        const loggedIn = await api.loginUser(provider, email, name);
        await saveUser(loggedIn);
        return loggedIn;
      } catch (error: any) {
        console.error('An error occurred during login', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [promptAsync]
  );

  const logout = useCallback(() => saveUser(null), []);

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
