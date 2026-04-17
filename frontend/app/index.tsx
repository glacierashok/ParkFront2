import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
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
import { getWeatherInfo } from '../utils/weather';
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

  // Sliding Animation State
  const [activeView, setActiveView] = useState<'top' | 'bottom'>('top');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: activeView === 'top' ? 0 : 1,
      duration: 400,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [activeView]);

  const topTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_HEIGHT],
  });

  const bottomTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

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
      <Pressable onPress={() => setActiveView('top')} style={{ zIndex: 10 }}>
        <EventTopBar meetup={meetup} loadingInitial={loadingInitial} weather={eventWeather} isClickableHint={activeView === 'bottom'} />
      </Pressable>

      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: topTranslateY }] }]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Brand Welcome ────────────────────────────────────────────── */}
        <View style={styles.brandRow}>
          <View style={styles.brandIconWrap}>
            <Ionicons name="walk" size={36} color={colors.primary} />
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandTitle}>Neighborhood Stride</Text>
            <Text style={styles.brandSub}>
              {meetup ? `Join us for our next walk at ${meetup.location}! ${meetup.weather_note} We meet up for fresh air, new friends, and great vibes.` : 'Join your community for organized weekend walks and jogs. We explore local trails, meet new friends, and build a healthier neighborhood together.'}
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

        <View style={styles.section}>
          <Text style={styles.nextNextLabel}>About Our Meetups</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>
              <Ionicons name="sunny" size={16} color={colors.primaryLight} /> We meet every weekend on Saturday and Sunday, weather permitting. Please keep an eye on this page—we will post updates here if an event is happening or cancelled due to weather conditions.
            </Text>
            
            <Text style={styles.activityText}>
              <Ionicons name="map" size={16} color={colors.primaryLight} /> We start by gathering at the parking lot, then move to our designated warm-up area to get ready. From there, we head out for a casual walk or jog. Once completed, we regroup in the cool-down area for a quick stretch and recovery. All paces are welcome!
            </Text>

            <Text style={styles.activityText}>
              <Ionicons name="document-text" size={16} color={colors.primaryLight} /> By participating, you acknowledge the inherent risks of physical activity and confirm you are in good physical condition. We take occasional community photos, and we strictly require everyone to treat fellow members and volunteers with respect.
            </Text>

            <Text style={styles.activityText}>
              <Ionicons name="water" size={16} color={colors.primaryLight} /> Please remember to wear comfortable athletic shoes and bring plenty of water!
            </Text>
          </View>
        </View>
        
          </ScrollView>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: bottomTranslateY }] }]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.nextNextLabel}>The Park & Conditions</Text>
              <View style={styles.activityCard}>
                <Text style={styles.activityText}>
                  <Ionicons name="leaf" size={16} color={colors.primaryLight} /> Our neighborhood park offers scenic, paved pathways surrounded by beautiful greenery—perfect for walking or jogging. It features a spacious parking lot, wide open spaces for our warm-ups, and accessible restrooms.
                </Text>
                {currentWeather && (
                  <Text style={styles.activityText}>
                    <Ionicons name="thermometer" size={16} color={colors.primaryLight} /> Live Conditions: It is currently {Math.round(currentWeather.temp)}°F with {getWeatherInfo(currentWeather.code).condition.toLowerCase()} weather. {currentWeather.temp < 50 ? 'Make sure to bundle up out there!' : 'It is a fantastic time to get some fresh air!'}
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>

      <Pressable onPress={() => setActiveView('bottom')} style={{ zIndex: 10 }}>
        <CurrentWeatherStrip loadingInitial={loadingInitial} weather={currentWeather} isClickableHint={activeView === 'top'} />
      </Pressable>
      
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
  activityCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  activityText: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
});
