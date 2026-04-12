import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="waiver" options={{ title: 'Liability Waiver', headerBackVisible: false }} />
    </Stack>
  );
}
