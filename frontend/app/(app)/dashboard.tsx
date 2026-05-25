import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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
import ParkMapModal from '../../components/ParkMapModal';

const PARK_COORDS = { latitude: 40.7812, longitude: -73.9665 }; // Placeholder coords
const GEOFENCE_RADIUS_METERS = 300;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  const [mapVisible, setMapVisible] = useState(false);
  const [inPark, setInPark] = useState(false);
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [parks, setParks] = useState<Record<string, import('../../types').Park>>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const nowMs = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    const [allMeetups, userRSVPs, allParks] = await Promise.all([
      api.getAllMeetups(),
      api.getUserRSVPs(user.id),
      api.getAllParks(),
    ]);

    const parksMap: Record<string, import('../../types').Park> = {};
    allParks.forEach(p => { parksMap[p.id] = p; });
    setParks(parksMap);
    // Filter future active meetups (keep visible until 2 hours after start)
    const futureMeetupsSorted = allMeetups
      .filter((m) => m.status === 'active' && (new Date(m.scheduled_time).getTime() + twoHours) > nowMs)
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

  useEffect(() => {
    if (!meetup) return;

    const nowMs = Date.now();
    const eventMs = new Date(meetup.scheduled_time).getTime();
    const oneHour = 60 * 60 * 1000;
    const twoHours = 2 * oneHour;

    if (nowMs >= eventMs - oneHour && nowMs <= eventMs + twoHours) {
      setCheckInVisible(true);
    } else {
      setCheckInVisible(false);
    }
  }, [meetup]);

  useEffect(() => {
    if (!checkInVisible) return;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });

      let targetLat = PARK_COORDS.latitude;
      let targetLng = PARK_COORDS.longitude;
      if (meetup?.park_id && parks[meetup.park_id]) {
        targetLat = parks[meetup.park_id].latitude ?? targetLat;
        targetLng = parks[meetup.park_id].longitude ?? targetLng;
      } else if (meetup?.latitude !== undefined && meetup?.longitude !== undefined) {
        targetLat = meetup.latitude;
        targetLng = meetup.longitude;
      }

      const distance = getDistance(
        location.coords.latitude, location.coords.longitude,
        targetLat, targetLng
      );
      setCalculatedDistance(distance);
      setInPark(distance <= GEOFENCE_RADIUS_METERS);
    })();
  }, [checkInVisible, meetup, parks]);

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

  const handleCheckIn = async () => {
    if (!user || !meetup) return;
    setRsvpLoading(meetup.id);
    try {
      let currentRsvpId = rsvp?.id;
      if (!rsvp) {
        const newRsvp = await api.upsertRSVP(meetup.id, user.id, 'going');
        setRsvp(newRsvp);
        currentRsvpId = newRsvp.id;
      }

      if (currentRsvpId) {
        const updated = await api.markAttendance(currentRsvpId, true, meetup.id, user.id);
        setRsvp(updated);
        Alert.alert("Checked In!", "You have successfully checked in to the park!");
      }
    } catch (e) {
      Alert.alert("Error", "Could not check in. Please try again.");
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const isCanceled = meetup?.status === 'canceled';

  // Keep the top bar in loading state until we have the park data for the current meetup.
  // This prevents a flash of "Unknown Park" while the parks map is being populated.
  const currentPark = meetup?.park_id ? parks[meetup.park_id] : null;
  const topBarLoading = loadingInitial || (!!meetup?.park_id && !currentPark);

  return (
    <AppBackground weather={weather}>
      <EventTopBar meetup={meetup} park={currentPark} loadingInitial={topBarLoading} weather={weather} />

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
            <View style={styles.greetingActions}>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* ── Map Trail Button ─────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [styles.mapTrailBtn, pressed && { opacity: 0.75 }]}
            onPress={() => setMapVisible(true)}
            accessibilityLabel="View park trail map"
            accessibilityRole="button"
          >
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={styles.mapTrailBtnText}>View Park Trail Map</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
          </Pressable>

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
                  {!checkInVisible && (
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
                    </>
                  )}
                  {rsvpLoading === meetup.id && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />}

                  {checkInVisible && !rsvp?.attended && (
                    <View style={{ marginTop: spacing.lg }}>
                      <Text style={styles.sectionTitle}>Event Check-In</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.rsvpBtnLarge,
                          {
                            backgroundColor: inPark ? colors.primary : 'rgba(59, 130, 246, 0.12)',
                            borderColor: colors.primary,
                            borderWidth: 2
                          },
                          pressed && inPark && { opacity: 0.8 }
                        ]}
                        onPress={handleCheckIn}
                        disabled={!inPark || !!rsvpLoading}
                      >
                        <Ionicons name="location" size={24} color={inPark ? '#fff' : colors.primary} />
                        <Text style={[styles.rsvpBtnTextLarge, { color: inPark ? '#fff' : colors.primary }]}>
                          {inPark ? "Check In Now" : `Check In (${calculatedDistance !== null ? Math.round(calculatedDistance) + 'm' : 'Too'} far)`}
                        </Text>
                      </Pressable>
                      {!inPark && userLocation && (
                        <Text style={{ fontSize: fontSizes.xs, color: 'rgba(255, 255, 255, 0.7)', marginTop: spacing.xs, textAlign: 'center' }}>
                          Current GPS: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)} | Target: {(meetup?.park_id && parks[meetup.park_id]?.latitude ? parks[meetup.park_id].latitude! : (meetup?.latitude ?? PARK_COORDS.latitude)).toFixed(4)}, {(meetup?.park_id && parks[meetup.park_id]?.longitude ? parks[meetup.park_id].longitude! : (meetup?.longitude ?? PARK_COORDS.longitude)).toFixed(4)}
                        </Text>
                      )}
                    </View>
                  )}
                  {checkInVisible && rsvp?.attended && (
                    <View style={{ marginTop: spacing.lg, alignItems: 'center', backgroundColor: colors.successLight, padding: spacing.md, borderRadius: radius.md }}>
                      <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                      <Text style={{ fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.success, marginTop: spacing.xs }}>You are checked in!</Text>
                    </View>
                  )}
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
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                    <View style={styles.nextNextIconWrap}>
                      <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
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

      <ParkMapModal visible={mapVisible} onClose={() => setMapVisible(false)} meetup={meetup} park={meetup?.park_id ? parks[meetup.park_id] : undefined} />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.xl, paddingHorizontal: spacing.md },

  // Greeting Section
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
  greetingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greetingActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm
  },

  mapTrailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.xs,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.45)',
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mapTrailBtnText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: '#fff',
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
  nextNextWeather: { alignItems: 'flex-end', backgroundColor: colors.primaryLight, padding: spacing.sm, borderRadius: radius.lg, minWidth: 60 },
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
