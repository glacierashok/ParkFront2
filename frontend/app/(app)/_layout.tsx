import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fontSizes, fontWeights, spacing } from '../../constants/theme';

export default function AppLayout() {
  const { user } = useAuth();

  if (!user) return <Redirect href="/" />;
  if (!user.waiver_accepted) return <Redirect href="/auth/waiver" />;

  const role = user.role;

  console.log('role', role);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderTopColor: colors.border,
          position: 'absolute',
          elevation: 0,
          borderTopWidth: 1,
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          marginBottom: 2,
        },
      }}
    >
      {/* ── Home (everyone) ─────────────────────────────── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Volunteer (volunteer & admin only) ──────────── */}
      <Tabs.Screen
        name="volunteer"
        options={{
          title: 'Volunteer',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
          href: role === 'volunteer' || role === 'admin' ? '/volunteer' : null
        }}
      />

      {/* ── Admin (admin only) ──────────────────────────── */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
          href: role === 'admin' ? '/admin' : null
        }}
      />

    </Tabs>
  );
}
