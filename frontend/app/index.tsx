import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { Meetup } from '../types';
import { colors, fontSizes, fontWeights, radius, shadows, spacing } from '../constants/theme';
import EventTopBar from '../components/EventTopBar';
import CurrentWeatherStrip from '../components/CurrentWeatherStrip';
import AppBackground from '../components/AppBackground';

export default function IndexScreen() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [nextNextMeetup, setNextNextMeetup] = useState<Meetup | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [eventWeather, setEventWeather] = useState<{ temp: number, code: number } | null>(null);
  const [currentWeather, setCurrentWeather] = useState<{ temp: number, code: number } | null>(null);

  useEffect(() => {
    const now = new Date().toISOString();
    api.getAllMeetups().then((all) => {
      const future = all
        .filter((m) => m.status === 'active' && m.scheduled_time > now)
        .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
      const upcoming = future[0] ?? null;
      const second = future[1] ?? null;
      setMeetup(upcoming);
      setNextNextMeetup(second);
      if (upcoming) api.getWeatherByTime(upcoming.scheduled_time).then(setEventWeather);
      setLoadingInitial(false);
    });
    api.getWeatherByTime(now).then(setCurrentWeather);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (!user.waiver_accepted) router.replace('/auth/waiver');
      else router.replace('/(app)/dashboard');
    }
  }, [user]);

  const handleLogin = async (provider: 'apple' | 'google') => {
    const loggedInUser = await login(provider);
    if (!loggedInUser.waiver_accepted) {
      router.replace('/auth/waiver');
    } else {
      router.replace('/(app)/dashboard');
    }
  };

  return (
    <AppBackground weather={eventWeather}>
      <EventTopBar meetup={meetup} loadingInitial={loadingInitial} weather={eventWeather} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Brand Welcome ────────────────────────────────────────────── */}
        <View style={styles.brandRow}>
          <View style={styles.brandIconWrap}>
            <Ionicons name="walk" size={36} color={colors.primary} />
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandTitle}>Neighborhood Stride</Text>
            <Text style={styles.brandSub}>
              {meetup && `Join us for our next walk at ${meetup.location}! ${meetup.weather_note} We meet up for fresh air, new friends, and great vibes.`}
            </Text>
            <Text style={styles.brandSub}>
              Join your community for organized weekend walks and jogs. We explore local trails, meet new friends, and build a healthier neighborhood together.
            </Text>
          </View>
        </View>

        {/* ── Also Coming Up ───────────────────────────────────────────── */}
        {nextNextMeetup && (
          <View style={styles.nextNextSection}>
            <Text style={styles.nextNextLabel}>Also Coming Up</Text>
            <View style={styles.nextNextCard}>
              <View style={styles.nextNextIconWrap}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.nextNextInfo}>
                <Text style={styles.nextNextDate}>
                  {new Date(nextNextMeetup.scheduled_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.nextNextTime}>
                  {new Date(nextNextMeetup.scheduled_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </View>
        )}

        {/* ── OAuth Buttons ────────────────────────────────────────────── */}
        <View style={[styles.section, { display: 'none' }]} >
          <Pressable
            style={[styles.oauthBtn, styles.googleBtn, isLoading && styles.btnDisabled]}
            onPress={() => handleLogin('google')}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.oauthBtnText}>Sign in with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.oauthBtn, styles.appleBtn, isLoading && styles.btnDisabled]}
            onPress={() => handleLogin('apple')}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={22} color="#fff" />
                <Text style={styles.oauthBtnText}>Sign in with Apple</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            By signing in, you agree to our Terms of Service. A waiver will be required on first login.
          </Text>
        </View>
      </ScrollView>

      <CurrentWeatherStrip loadingInitial={loadingInitial} weather={currentWeather} />
      
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing['2xl'], paddingTop: spacing.xl },

  // Brand Row (Replaces Hero)
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  brandIconWrap: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextWrap: { flex: 1 },
  brandTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: '#fff', marginBottom: 4 },
  brandSub: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },

  // Also Coming Up
  nextNextSection: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  nextNextLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  nextNextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    ...shadows.sm,
  },
  nextNextIconWrap: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  nextNextInfo: { flex: 1 },
  nextNextDate: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },
  nextNextTime: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },

  // Section
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  sectionHeader: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  // Role selector
  roleHint: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
  roleRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  roleChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleChipText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium },
  roleChipTextActive: { color: colors.primary },

  // OAuth Buttons
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  googleBtn: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
  appleBtn: { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  oauthBtnText: { fontSize: fontSizes.md, color: '#fff', fontWeight: fontWeights.semibold },
  btnDisabled: { opacity: 0.6 },
  disclaimer: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
