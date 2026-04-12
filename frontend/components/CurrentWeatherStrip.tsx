import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSizes, fontWeights, radius, shadows, spacing } from '../constants/theme';
import { getWeatherInfo } from '../utils/weather';

interface CurrentWeatherStripProps {
  loadingInitial: boolean;
  weather: { temp: number; code: number } | null;
}



export const getConditionInfo = (weather: { code: number } | null, isCanceled: boolean) => {
  if (isCanceled) {
    return { bg: '#625F6E', icon: 'sad-outline' as const, label: 'Canceled' };
  }
  if (!weather) {
    return { bg: '#4CA1AF', icon: 'partly-sunny-outline' as const, label: 'Loading...' };
  }

  const info = getWeatherInfo(weather.code);
  return { bg: info.bg, icon: info.icon, label: info.condition };
};

export default function CurrentWeatherStrip({ loadingInitial, weather }: CurrentWeatherStripProps) {
  const insets = useSafeAreaInsets();
  const condition = getConditionInfo(weather, false);

  return (
    <View style={[styles.strip, { backgroundColor: condition.bg, marginBottom: insets.bottom + spacing.md }]}>
      <View style={styles.stripContent}>
        <View style={styles.stripMain}>
          <Text style={styles.stripPreTitle}>Current Park Weather</Text>
          {loadingInitial || !weather ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginLeft: spacing.sm }} />
          ) : (
            <Text style={styles.stripTemp}>{Math.round(weather.temp)}°F</Text>
          )}
        </View>

        <View style={styles.stripCondition}>
          <Ionicons name={condition.icon} size={22} color="#fff" />
          <Text style={styles.stripConditionText}>{condition.label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.xl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stripContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stripMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stripPreTitle: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stripTemp: {
    fontSize: fontSizes.lg,
    color: '#fff',
    fontWeight: fontWeights.bold,
  },
  stripCondition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stripConditionText: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
});
