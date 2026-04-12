import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Meetup } from '../types';
import { fontSizes, fontWeights, radius, shadows, spacing } from '../constants/theme';
import { getWeatherInfo } from '../utils/weather';

interface EventTopBarProps {
  meetup: Meetup | null;
  loadingInitial: boolean;
  weather: { temp: number; code: number } | null;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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

export default function EventTopBar({ meetup, loadingInitial, weather }: EventTopBarProps) {
  const insets = useSafeAreaInsets();
  const isCanceled = meetup?.status === 'canceled';
  const condition = getConditionInfo(weather, isCanceled || false);

  return (
    <View style={[styles.topBar, { backgroundColor: condition.bg, paddingTop: insets.top + spacing.md }]}>
      <View style={styles.topBarContent}>
        <View style={styles.topBarMain}>
          <Text style={styles.topBarPreTitle}>
            {isCanceled ? 'Event Canceled' : 'Next Walk'}
          </Text>
          {loadingInitial ? (
            <ActivityIndicator color="#fff" style={{ alignSelf: 'flex-start', marginTop: 8 }} />
          ) : meetup ? (
            <>
              <Text style={[styles.topBarLocation, isCanceled && styles.strikethrough]} numberOfLines={1}>
                {meetup.location}
              </Text>
              <Text style={styles.topBarTime}>
                {formatDate(meetup.scheduled_time)}
              </Text>
            </>
          ) : (
            <Text style={styles.topBarLocation}>No upcoming walks</Text>
          )}
        </View>

        {meetup && (
          <View style={styles.topBarWeather}>
            <Ionicons name={condition.icon} size={28} color="#fff" />
            <Text style={styles.topBarWeatherText}>
              {isCanceled ? 'Canceled' : weather ? `${Math.round(weather.temp)}°F\n${getWeatherInfo(weather.code).condition}` : 'Loading...'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, ...shadows.md },
  topBarContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  topBarMain: { flex: 1, paddingRight: spacing.md },
  topBarPreTitle: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.8)', fontWeight: fontWeights.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  topBarLocation: { fontSize: fontSizes['2xl'], color: '#fff', fontWeight: fontWeights.bold, marginBottom: 4 },
  topBarTime: { fontSize: fontSizes.md, color: 'rgba(255,255,255,0.9)', fontWeight: fontWeights.medium },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.7 },
  topBarWeather: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', padding: spacing.sm, borderRadius: radius.lg, minWidth: 70 },
  topBarWeatherText: { color: '#fff', fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, marginTop: 4, textAlign: 'center' },
});
