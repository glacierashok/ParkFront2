import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Meetup, RSVP, User, VolunteerLog } from '../../types';
import { colors, fontSizes, fontWeights, radius, shadows, spacing } from '../../constants/theme';

type VolunteerTab = 'attendance' | 'profile';

export default function VolunteerScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<VolunteerTab>('attendance');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Tab pills */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, tab === 'attendance' && styles.tabBtnActive]}
          onPress={() => setTab('attendance')}
        >
          <Ionicons name="checkbox-outline" size={16} color={tab === 'attendance' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.tabBtnText, tab === 'attendance' && styles.tabBtnTextActive]}>Attendance</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'profile' && styles.tabBtnActive]}
          onPress={() => setTab('profile')}
        >
          <Ionicons name="person-outline" size={16} color={tab === 'profile' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.tabBtnText, tab === 'profile' && styles.tabBtnTextActive]}>My Profile</Text>
        </Pressable>
      </View>

      {tab === 'attendance' ? <AttendanceTab /> : <ProfileTab />}
    </SafeAreaView>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────
function AttendanceTab() {
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [m, allUsers] = await Promise.all([api.getUpcomingMeetup(), api.getAllUsers()]);
    setMeetup(m);
    setUsers(allUsers);
    if (m) {
      const rs = await api.getRSVPsForMeetup(m.id);
      setRsvps(rs);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleAttendance = async (rsvp: RSVP) => {
    setUpdatingId(rsvp.id);
    try {
      const updated = await api.markAttendance(rsvp.id, !rsvp.attended, rsvp.meetup_id, rsvp.user_id);
      setRsvps((prev) => prev.map((r) => (r.id === rsvp.id ? updated : r)));
    } catch {
      Alert.alert('Error', 'Could not update attendance.');
    } finally {
      setUpdatingId(null);
    }
  };

  const goingRSVPs = rsvps.filter((r) => r.intent === 'going');
  const getUserName = (uid: string) => users.find((u) => u.id === uid)?.full_name ?? uid;

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {meetup && (
        <View style={styles.infoCard}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.infoCardText}>{meetup.location}</Text>
        </View>
      )}
      <Text style={styles.sectionTitle}>
        RSVPs ({goingRSVPs.length} going)
      </Text>
      {goingRSVPs.length === 0 && <Text style={styles.empty}>No RSVPs yet.</Text>}
      {goingRSVPs.map((rsvp) => (
        <View key={rsvp.id} style={styles.rsvpItem}>
          <View style={styles.rsvpItemLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getUserName(rsvp.user_id).charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.rsvpName}>{getUserName(rsvp.user_id)}</Text>
              <Text style={styles.rsvpStatus}>{rsvp.attended ? '✅ Attended' : '⏳ Not marked'}</Text>
            </View>
          </View>
          <Pressable
            style={[styles.attendBtn, rsvp.attended && styles.attendBtnActive]}
            onPress={() => toggleAttendance(rsvp)}
            disabled={updatingId === rsvp.id}
          >
            {updatingId === rsvp.id
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name={rsvp.attended ? 'checkmark' : 'add'} size={18} color="#fff" />}
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<VolunteerLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) api.getVolunteerLogs(user.id).then((l) => { setLogs(l); setLoading(false); });
  }, [user]);

  const verified = logs.filter((l) => l.status === 'verified');
  const pending = logs.filter((l) => l.status === 'pending');
  const totalHours = verified.reduce((sum, l) => sum + l.hours_credited, 0);
  const nextRole = pending[0]?.assigned_role ?? 'TBD';

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Stats */}
      <View style={styles.profileStatsRow}>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatValue}>{totalHours}</Text>
          <Text style={styles.profileStatLabel}>Verified Hours</Text>
        </View>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatValue}>{verified.length}</Text>
          <Text style={styles.profileStatLabel}>Shifts Done</Text>
        </View>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatValue}>{pending.length}</Text>
          <Text style={styles.profileStatLabel}>Pending</Text>
        </View>
      </View>

      <View style={styles.nextRoleCard}>
        <Ionicons name="ribbon-outline" size={20} color={colors.secondary} />
        <View>
          <Text style={styles.nextRoleLabel}>Next Assigned Role</Text>
          <Text style={styles.nextRoleValue}>{nextRole}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shift History</Text>
      {logs.length === 0 && <Text style={styles.empty}>No shifts recorded.</Text>}
      {logs.map((log) => (
        <View key={log.id} style={styles.logItem}>
          <View style={styles.logLeft}>
            <Ionicons
              name={log.status === 'verified' ? 'checkmark-circle' : 'time-outline'}
              size={20}
              color={log.status === 'verified' ? colors.success : colors.muted}
            />
            <View>
              <Text style={styles.logRole}>{log.assigned_role}</Text>
              <Text style={styles.logMeta}>{log.hours_credited}h · {log.status}</Text>
            </View>
          </View>
          <View style={[styles.logBadge, log.status === 'verified' && styles.logBadgeVerified]}>
            <Text style={[styles.logBadgeText, log.status === 'verified' && styles.logBadgeTextVerified]}>
              {log.status}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium },
  tabBtnTextActive: { color: '#fff' },
  tabContent: { padding: spacing.md, paddingBottom: spacing['2xl'] },

  // Attendance
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  infoCardText: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: fontWeights.medium },

  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.sm },
  empty: { color: colors.muted, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.lg },

  rsvpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  rsvpItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: fontWeights.bold, fontSize: fontSizes.md },
  rsvpName: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  rsvpStatus: { fontSize: fontSizes.sm, color: colors.textSecondary },
  attendBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendBtnActive: { backgroundColor: colors.success },

  // Profile
  profileStatsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  profileStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  profileStatValue: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.primary },
  profileStatLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },

  nextRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nextRoleLabel: { fontSize: fontSizes.xs, color: colors.secondary },
  nextRoleValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.secondary },

  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  logLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logRole: { fontSize: fontSizes.md, fontWeight: fontWeights.medium, color: colors.text },
  logMeta: { fontSize: fontSizes.sm, color: colors.textSecondary },
  logBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.background,
    borderRadius: radius.full,
  },
  logBadgeVerified: { backgroundColor: colors.successLight },
  logBadgeText: { fontSize: fontSizes.xs, color: colors.muted, fontWeight: fontWeights.medium },
  logBadgeTextVerified: { color: colors.success },
});
