import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { VolunteerLog, RSVP, Meetup, Park } from '../../types';
import { colors, fontSizes, fontWeights, radius, shadows, spacing } from '../../constants/theme';

type VolunteerTab = 'overview' | 'attendees';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'ribbon-outline' },
  { key: 'attendees', label: 'Attendees', icon: 'people-outline' },
];

export default function VolunteerScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<VolunteerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<VolunteerTab>('overview');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const l = await api.getVolunteerLogs(user.id);
      setLogs(l);
    } catch (err) {
      console.warn("Failed to load volunteer logs", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const verified = logs.filter((l) => l.status === 'verified');
  const pending = logs.filter((l) => l.status === 'pending');
  const totalHours = verified.reduce((sum, l) => sum + l.hours_credited, 0);
  const nextRole = pending[0]?.assigned_role ?? 'TBD';
  const nextMeetupId = pending[0]?.meetup_id;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header bar */}
      <View style={styles.header}>
        <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
        <Text style={styles.headerTitle}>Volunteer Dashboard</Text>
      </View>

      {/* Tab scrollable bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarScroll}
        contentContainerStyle={styles.tabBar}
      >
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => setTab(t.key as VolunteerTab)}
          >
            <Ionicons name={t.icon as any} size={15} color={tab === t.key ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabChipText, tab === t.key && styles.tabChipTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'overview' && (
          <OverviewTab
            totalHours={totalHours}
            verifiedCount={verified.length}
            pendingCount={pending.length}
            nextRole={nextRole}
            logs={logs}
          />
        )}
        {tab === 'attendees' && (
          <AttendeesTab meetupId={nextMeetupId} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ totalHours, verifiedCount, pendingCount, nextRole, logs }: any) {
  return (
    <>
      {/* Stats */}
      <View style={styles.profileStatsRow}>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatValue}>{totalHours}</Text>
          <Text style={styles.profileStatLabel}>Verified Hours</Text>
        </View>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatValue}>{verifiedCount}</Text>
          <Text style={styles.profileStatLabel}>Shifts Done</Text>
        </View>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatValue}>{pendingCount}</Text>
          <Text style={styles.profileStatLabel}>Pending</Text>
        </View>
      </View>

      {/* Next Assigned Role Card */}
      <View style={styles.nextRoleCard}>
        <Ionicons name="people-outline" size={20} color={colors.secondary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.nextRoleLabel}>Next Assigned Role</Text>
          <Text style={styles.nextRoleValue}>{nextRole}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shift History</Text>
      {logs.length === 0 && <Text style={styles.empty}>No shifts recorded yet.</Text>}
      {logs.map((log: VolunteerLog) => (
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
    </>
  );
}

// ─── Attendees Tab ─────────────────────────────────────────────────────────────
function AttendeesTab({ meetupId: defaultMeetupId }: { meetupId?: string }) {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [parks, setParks] = useState<Park[]>([]);
  const [selectedMeetupId, setSelectedMeetupId] = useState<string | null>(defaultMeetupId || null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'going' | 'checked_in' | 'not_going'>('going');

  // Load meetups and parks
  useEffect(() => {
    Promise.all([api.getAllMeetups(), api.getAllParks()]).then(([m, p]) => {
      const active = m.filter(x => x.status === 'active');
      setMeetups(active);
      setParks(p);
      if (!selectedMeetupId && active.length > 0) {
        setSelectedMeetupId(active[0].id);
      }
    }).catch(err => console.warn('Failed to fetch meetups', err))
      .finally(() => setLoading(false));
  }, []);

  // Load RSVPs when selectedMeetupId changes
  useEffect(() => {
    if (selectedMeetupId) {
      setLoading(true);
      api.getRSVPsForMeetup(selectedMeetupId)
        .then(setRsvps)
        .catch(err => console.warn('Failed to fetch RSVPs', err))
        .finally(() => setLoading(false));
    }
  }, [selectedMeetupId]);

  if (loading && meetups.length === 0) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
  }

  if (meetups.length === 0) {
    return <Text style={styles.empty}>No active meetups found.</Text>;
  }

  const attending = rsvps.filter(r => r.intent === 'going');
  const checkedIn = rsvps.filter(r => r.attended);
  const notAttending = rsvps.filter(r => r.intent === 'not_going');

  // Determine which list to show
  let displayList = attending;
  if (filter === 'checked_in') displayList = checkedIn;
  if (filter === 'not_going') displayList = notAttending;

  // Sort list to show checked in first, if applicable
  displayList.sort((a, b) => {
    if (a.attended === b.attended) {
      return (a.user_full_name || '').localeCompare(b.user_full_name || '');
    }
    return a.attended ? -1 : 1;
  });

  return (
    <>
      {/* Meetup Selector */}
      <Text style={styles.sectionTitle}>Select Meetup</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
        {meetups.map(m => {
          const park = parks.find(p => p.id === m.park_id);
          const isSelected = m.id === selectedMeetupId;
          const dateStr = new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return (
            <Pressable
              key={m.id}
              style={[styles.meetupChip, isSelected && styles.meetupChipActive]}
              onPress={() => setSelectedMeetupId(m.id)}
            >
              <Text style={[styles.meetupChipText, isSelected && styles.meetupChipTextActive]}>
                {park?.name || 'Unknown Park'} · {dateStr}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Stats (Clickable) */}
      <View style={styles.profileStatsRow}>
        <Pressable 
          style={[styles.profileStatCard, filter === 'going' ? { backgroundColor: colors.primary } : { backgroundColor: colors.primaryLight }]}
          onPress={() => setFilter('going')}
        >
          <Text style={[styles.profileStatValue, filter === 'going' ? { color: '#fff' } : { color: colors.primary }]}>{attending.length}</Text>
          <Text style={[styles.profileStatLabel, filter === 'going' && { color: 'rgba(255,255,255,0.8)' }]}>Going</Text>
        </Pressable>

        <Pressable 
          style={[styles.profileStatCard, filter === 'checked_in' ? { backgroundColor: colors.success } : { backgroundColor: colors.successLight }]}
          onPress={() => setFilter('checked_in')}
        >
          <Text style={[styles.profileStatValue, filter === 'checked_in' ? { color: '#fff' } : { color: colors.success }]}>{checkedIn.length}</Text>
          <Text style={[styles.profileStatLabel, filter === 'checked_in' && { color: 'rgba(255,255,255,0.8)' }]}>Checked In</Text>
        </Pressable>

        <Pressable 
          style={[styles.profileStatCard, filter === 'not_going' ? { backgroundColor: colors.alert } : { backgroundColor: colors.alertLight }]}
          onPress={() => setFilter('not_going')}
        >
          <Text style={[styles.profileStatValue, filter === 'not_going' ? { color: '#fff' } : { color: colors.alert }]}>{notAttending.length}</Text>
          <Text style={[styles.profileStatLabel, filter === 'not_going' && { color: 'rgba(255,255,255,0.8)' }]}>Not Going</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>
        {filter === 'going' ? 'Attending Users' : filter === 'checked_in' ? 'Checked In Users' : 'Not Attending Users'}
      </Text>
      
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : displayList.length === 0 ? (
        <Text style={styles.empty}>No users found for this filter.</Text>
      ) : (
        displayList.map(rsvp => (
          <View key={rsvp.id} style={styles.attendeeRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(rsvp.user_full_name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.attendeeName}>{rsvp.user_full_name || 'Unknown User'}</Text>
            
            {rsvp.attended && (
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.badgeText}>Checked In</Text>
              </View>
            )}
          </View>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },

  tabBarScroll: {
    flexGrow: 0,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
  },
  tabChipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: '#fff',
  },

  tabContent: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.sm },
  empty: { color: colors.muted, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.lg },

  // Stats
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

  // Next Role Card
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

  // Logs
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

  // Attendees
  meetupChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meetupChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  meetupChipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  meetupChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  attendeeName: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    color: colors.success,
    fontWeight: fontWeights.bold,
  },
});
