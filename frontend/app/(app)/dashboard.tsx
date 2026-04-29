import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { getWeatherInfo } from '../../utils/weather';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Meetup, RSVP } from '../../types';
import { colors, fontSizes, fontWeights, radius, shadows, spacing } from '../../constants/theme';
import EventTopBar from '../../components/EventTopBar';
import AppBackground from '../../components/AppBackground';
import CurrentWeatherStrip from '../../components/CurrentWeatherStrip';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [futureMeetups, setFutureMeetups] = useState<Meetup[]>([]);
  const [rsvp, setRsvp] = useState<RSVP | null>(null);
  const [rsvpsMap, setRsvpsMap] = useState<Record<string, RSVP>>({});
  const [weatherMap, setWeatherMap] = useState<Record<string, { temp: number, code: number }>>({});
  const [attendedCount, setAttendedCount] = useState(0);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState<{ temp: number, code: number } | null>(null);
  const [currentWeather, setCurrentWeather] = useState<{ temp: number, code: number } | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const [allMeetups, userRSVPs] = await Promise.all([
      api.getAllMeetups(),
      api.getUserRSVPs(user.id),
    ]);
    // Filter future active meetups sorted ascending
    const futureMeetupsSorted = allMeetups
      .filter((m) => m.status === 'active' && m.scheduled_time > now)
      .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

    const upcomingMeetup = futureMeetupsSorted[0] ?? null;
    const others = futureMeetupsSorted.slice(1, 4);

    setMeetup(upcomingMeetup);
    setFutureMeetups(others);

    if (upcomingMeetup) {
      const existing = userRSVPs.find((r) => r.meetup_id === upcomingMeetup.id) ?? null;
      setRsvp(existing);
      api.getWeatherByTime(upcomingMeetup.scheduled_time).then(setWeather);
    }

    // Process RSVPs and weather for others
    const newRsvpsMap: Record<string, RSVP> = {};
    others.forEach(m => {
      const found = userRSVPs.find(r => r.meetup_id === m.id);
      if (found) newRsvpsMap[m.id] = found;
      api.getWeatherByTime(m.scheduled_time).then(w => {
        if (w) setWeatherMap(prev => ({ ...prev, [m.id]: w }));
      });
    });
    setRsvpsMap(newRsvpsMap);
        
    setAttendedCount(userRSVPs.filter((r) => r.attended).length);
    api.getWeatherByTime(now).then(setCurrentWeather);
  }, [user]);

  useEffect(() => {
    loadData().finally(() => setLoadingInitial(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleRSVP = async (targetMeetup: Meetup, intent: 'going' | 'not_going') => {
    if (!user) return;
    setRsvpLoading(targetMeetup.id);
    try {
      const updated = await api.upsertRSVP(targetMeetup.id, user.id, intent);
      if (targetMeetup.id === meetup?.id) {
        setRsvp(updated);
      } else {
        setRsvpsMap(prev => ({ ...prev, [targetMeetup.id]: updated }));
      }
    } catch {
      Alert.alert('Error', 'Could not update RSVP. Try again.');
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const isCanceled = meetup?.status === 'canceled';

  return (
    <AppBackground weather={weather}>
      <EventTopBar meetup={meetup} loadingInitial={loadingInitial} weather={weather} />

      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Personal Greeting & Top Actions ───────────────────────── */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingLeft}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || 'N'}</Text>
              </View>
              <View>
                <Text style={styles.greeting}>
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'},
                </Text>
                <Text style={styles.greetingName}>{user?.full_name ?? 'Neighbor'} 👋</Text>
              </View>
            </View>
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* ── Stats row ────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrapperPrimary}>
                <Ionicons name="footsteps" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.statValue}>{attendedCount}</Text>
                <Text style={styles.statLabel}>Walks Attended</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[
                styles.statIconWrapperSecondary,
                rsvp?.intent === 'going' && styles.statIconWrapperGoing,
                rsvp?.intent === 'not_going' && styles.statIconWrapperNotGoing
              ]}>
                <Ionicons
                  name={rsvp?.intent === 'going' ? 'checkmark' : rsvp?.intent === 'not_going' ? 'close' : 'help'}
                  size={22}
                  color={rsvp?.intent === 'going' ? colors.success : rsvp?.intent === 'not_going' ? colors.alert : colors.secondary}
                />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {rsvp?.intent === 'going' ? 'Attending' : rsvp?.intent === 'not_going' ? 'Not Attending' : 'No RSVP'}
                </Text>
                <Text style={styles.statLabel}>Next Walk</Text>
              </View>
            </View>
          </View>

          {/* ── Action Area (RSVP or Canceled Card) ─────────────────────────── */}
          {meetup && (
            <View style={styles.actionArea}>
              {isCanceled ? (
                <View style={styles.canceledCard}>
                  <Ionicons name="alert-circle-outline" size={32} color={colors.alert} />
                  <Text style={styles.canceledCardTitle}>Event Canceled</Text>
                  <Text style={styles.canceledCardDesc}>
                    We're sorry to announce that this walk has been canceled. {meetup.weather_note}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Are you coming?</Text>
                  <View style={styles.rsvpContainer}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.rsvpBtnLarge,
                        styles.rsvpBtnGoing,
                        rsvp?.intent === 'going' && styles.rsvpBtnActiveGoing,
                        rsvpLoading === meetup.id && styles.btnDisabled,
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => handleRSVP(meetup, 'going')}
                      disabled={!!rsvpLoading}
                    >
                      <Ionicons name="checkmark-circle" size={24} color={rsvp?.intent === 'going' ? '#fff' : colors.success} />
                      <Text style={[styles.rsvpBtnTextLarge, rsvp?.intent === 'going' ? { color: '#fff' } : { color: colors.success }]}>
                        I'll Be There
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.rsvpBtnLarge,
                        styles.rsvpBtnNotGoing,
                        rsvp?.intent === 'not_going' && styles.rsvpBtnActiveNotGoing,
                        rsvpLoading === meetup.id && styles.btnDisabled,
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => handleRSVP(meetup, 'not_going')}
                      disabled={!!rsvpLoading}
                    >
                      <Ionicons name="close-circle" size={24} color={rsvp?.intent === 'not_going' ? '#fff' : colors.alert} />
                      <Text style={[styles.rsvpBtnTextLarge, rsvp?.intent === 'not_going' ? { color: '#fff' } : { color: colors.alert }]}>
                        Can't Make It
                      </Text>
                    </Pressable>
                  </View>
                  {rsvpLoading === meetup.id && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />}
                </>
              )}
            </View>
          )}

          {/* ── Also Coming Up ──────────────────────────────────── */}
          {futureMeetups.length > 0 && (
            <View style={styles.nextNextSection}>
              <Text style={styles.sectionTitle}>Also Coming Up</Text>
              {futureMeetups.map((m) => (
                <View key={m.id} style={[styles.nextNextCard, { marginBottom: spacing.md, flexDirection: 'column' }]}>

                  {/* Row 1: icon + date/time + weather */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={styles.nextNextIconWrap}>
                      <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nextNextDate}>
                        {new Date(m.scheduled_time).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text style={[styles.nextNextTime, { marginTop: 2 }]}>
                        {new Date(m.scheduled_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                    </View>
                    {weatherMap[m.id] && (
                      <View style={styles.nextNextWeather}>
                        <Ionicons name={getWeatherInfo(weatherMap[m.id].code).icon} size={20} color={colors.primary} />
                        <Text style={styles.nextNextWeatherText}>
                          {`${Math.round(weatherMap[m.id].temp)}°F\n${getWeatherInfo(weatherMap[m.id].code).condition}`}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Row 2: RSVP buttons */}
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                    <Pressable
                      style={[
                        styles.nextNextRsvpBtn,
                        rsvpsMap[m.id]?.intent === 'going' ? styles.nextNextRsvpBtnGoingActive : styles.nextNextRsvpBtnGoing,
                        !!rsvpLoading && styles.btnDisabled,
                      ]}
                      onPress={() => handleRSVP(m, 'going')}
                      disabled={!!rsvpLoading}
                    >
                      <Ionicons
                        name={rsvpsMap[m.id]?.intent === 'going' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={16}
                        color={rsvpsMap[m.id]?.intent === 'going' ? '#fff' : colors.success}
                      />
                      <Text style={[styles.nextNextRsvpBtnText, rsvpsMap[m.id]?.intent === 'going' && { color: '#fff' }]}>
                        I'll Be There
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.nextNextRsvpBtn,
                        rsvpsMap[m.id]?.intent === 'not_going' ? styles.nextNextRsvpBtnNotGoingActive : styles.nextNextRsvpBtnNotGoing,
                        !!rsvpLoading && styles.btnDisabled,
                      ]}
                      onPress={() => handleRSVP(m, 'not_going')}
                      disabled={!!rsvpLoading}
                    >
                      <Ionicons
                        name={rsvpsMap[m.id]?.intent === 'not_going' ? 'close-circle' : 'close-circle-outline'}
                        size={16}
                        color={rsvpsMap[m.id]?.intent === 'not_going' ? '#fff' : colors.alert}
                      />
                      <Text style={[styles.nextNextRsvpBtnText, rsvpsMap[m.id]?.intent === 'not_going' && { color: '#fff' }]}>
                        Can't Make It
                      </Text>
                    </Pressable>
                    {rsvpLoading === m.id && <ActivityIndicator color={colors.primary} />}
                  </View>

                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <View style={{ marginBottom: user?.role === 'neighbor' ? 0 : 60 }}>
        <CurrentWeatherStrip loadingInitial={loadingInitial} weather={currentWeather} />
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.xl, paddingHorizontal: spacing.md },

  // Greeting Section
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.xs },
  greetingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarPlaceholder: {
    width: 50, height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.primary },
  greeting: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.8)' },
  greetingName: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: '#fff', marginBottom: 2 },
  logoutBtn: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    ...shadows.sm
  },

  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: '#fff', marginBottom: spacing.md, paddingHorizontal: spacing.xs },

  // Stats Section
  statsRow: { flexDirection: 'column', gap: spacing.md, marginBottom: spacing.xl },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  statIconWrapperPrimary: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  statIconWrapperSecondary: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondaryLight, alignItems: 'center', justifyContent: 'center' },
  statIconWrapperGoing: { backgroundColor: colors.successLight },
  statIconWrapperNotGoing: { backgroundColor: colors.alertLight },
  statValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  statLabel: { fontSize: fontSizes.sm, color: colors.textSecondary },

  // Action Area
  actionArea: { marginTop: spacing.xs },

  // Next-Next Section
  nextNextSection: { marginTop: spacing.xl },
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
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  nextNextInfo: { flex: 1 },
  nextNextDate: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },
  nextNextTime: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  nextNextWeather: { alignItems: 'center', backgroundColor: colors.primaryLight, padding: spacing.sm, borderRadius: radius.lg, minWidth: 60 },
  nextNextWeatherText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.primary, marginTop: 4, textAlign: 'center' },
  nextNextRsvpContainer: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  nextNextRsvpBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1.5, gap: 6 },
  nextNextRsvpBtnGoing: { borderColor: colors.success, backgroundColor: colors.surface },
  nextNextRsvpBtnGoingActive: { borderColor: colors.success, backgroundColor: colors.success },
  nextNextRsvpBtnNotGoing: { borderColor: colors.alert, backgroundColor: colors.surface },
  nextNextRsvpBtnNotGoingActive: { borderColor: colors.alert, backgroundColor: colors.alert },
  nextNextRsvpBtnText: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.textSecondary },

  canceledCard: {
    backgroundColor: colors.alertLight,
    padding: spacing.xl,
    borderRadius: radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  canceledCardTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.alert, marginTop: spacing.sm, marginBottom: spacing.xs },
  canceledCardDesc: { fontSize: fontSizes.md, color: colors.text, textAlign: 'center', lineHeight: 22 },

  rsvpContainer: { gap: spacing.md },
  rsvpBtnLarge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 2,
    ...shadows.sm,
    backgroundColor: colors.surface,
  },
  rsvpBtnGoing: { borderColor: colors.success },
  rsvpBtnNotGoing: { borderColor: colors.alert },
  rsvpBtnActiveGoing: { backgroundColor: colors.success },
  rsvpBtnActiveNotGoing: { backgroundColor: colors.alert },
  rsvpBtnTextLarge: { fontSize: fontSizes.md, fontWeight: fontWeights.bold },
  btnDisabled: { opacity: 0.5 },
});
