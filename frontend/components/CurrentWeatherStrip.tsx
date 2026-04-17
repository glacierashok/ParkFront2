import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSizes, fontWeights, radius, shadows, spacing } from '../constants/theme';
import { getWeatherInfo } from '../utils/weather';

interface CurrentWeatherStripProps {
  loadingInitial: boolean;
  weather: { temp: number; code: number } | null;
  isClickableHint?: boolean;
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

export default function CurrentWeatherStrip({ loadingInitial, weather, isClickableHint }: CurrentWeatherStripProps) {
  const insets = useSafeAreaInsets();
  const condition = getConditionInfo(weather, false);

  return (
    <View style={[styles.bottomBar, { backgroundColor: condition.bg, paddingBottom: insets.bottom + spacing.xl }]}>
      {isClickableHint && (
        <View style={{ alignItems: 'center', marginBottom: spacing.sm, opacity: 0.8, width: '100%', position: 'absolute', top: spacing.md, left: spacing.xl }}>
          <Ionicons name="chevron-up" size={24} color="#fff" />
        </View>
      )}
      
      <View style={[styles.bottomBarMain, isClickableHint && { marginTop: spacing.lg }]}>
        <Text style={styles.bottomBarPreTitle}>Current Weather</Text>
        {loadingInitial ? (
          <ActivityIndicator color="#fff" style={{ alignSelf: 'flex-start', marginTop: 8 }} />
        ) : weather ? (
          <>
            <Text style={styles.bottomBarLocation} numberOfLines={1}>
              Right Now
            </Text>
            <Text style={styles.bottomBarTime}>
              Live checking park conditions
            </Text>
          </>
        ) : (
          <Text style={styles.bottomBarLocation}>Loading...</Text>
        )}
      </View>

      {weather && (
        <View style={[styles.bottomBarWeather, isClickableHint && { marginTop: spacing.lg }]}>
          <Ionicons name={condition.icon} size={28} color="#fff" />
          <Text style={styles.bottomBarWeatherText}>
            {`${Math.round(weather.temp)}°F\n${condition.label}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl, 
    paddingTop: spacing.xl, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    ...shadows.md 
  },
  bottomBarMain: { flex: 1, paddingRight: spacing.md },
  bottomBarPreTitle: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.8)', fontWeight: fontWeights.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  bottomBarLocation: { fontSize: fontSizes['2xl'], color: '#fff', fontWeight: fontWeights.bold, marginBottom: 4 },
  bottomBarTime: { fontSize: fontSizes.md, color: 'rgba(255,255,255,0.9)', fontWeight: fontWeights.medium },
  bottomBarWeather: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', padding: spacing.sm, borderRadius: radius.lg, minWidth: 70 },
  bottomBarWeatherText: { color: '#fff', fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, marginTop: 4, textAlign: 'center' },
});
