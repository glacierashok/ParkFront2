import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../../services/api';
import { Meetup, User, VolunteerLog } from '../../types';
import { colors, fontSizes, fontWeights, radius, shadows, spacing } from '../../constants/theme';

type AdminTab = 'overview' | 'events' | 'roles' | 'hours';

const TABS: { key: AdminTab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'bar-chart-outline' },
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
  { key: 'roles', label: 'Roles', icon: 'person-add-outline' },
  { key: 'hours', label: 'Hours', icon: 'checkmark-done-outline' },
];

export default function AdminScreen() {
  const [tab, setTab] = useState<AdminTab>('overview');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
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
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon as any} size={15} color={tab === t.key ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabChipText, tab === t.key && styles.tabChipTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'events' && <EventsTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'hours' && <HoursTab />}
    </SafeAreaView>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab() {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<VolunteerLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAllMeetups(), api.getAllUsers(), api.getPendingVolunteerLogs()])
      .then(([m, u, l]) => { setMeetups(m); setUsers(u); setLogs(l); setLoading(false); });
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  const active = meetups.filter((m) => m.status === 'active').length;
  const canceled = meetups.filter((m) => m.status === 'canceled').length;
  const volunteers = users.filter((u) => u.role === 'volunteer' || u.role === 'admin').length;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.pageTitle}>Admin Overview</Text>
      <View style={styles.metricsGrid}>
        {[
          { label: 'Total Users', value: users.length, icon: 'people-outline', color: colors.primary },
          { label: 'Active Events', value: active, icon: 'calendar-outline', color: colors.success },
          { label: 'Canceled Events', value: canceled, icon: 'close-circle-outline', color: colors.alert },
          { label: 'Volunteers', value: volunteers, icon: 'ribbon-outline', color: colors.secondary },
          { label: 'Pending Hours', value: logs.length, icon: 'time-outline', color: '#F59E0B' },
          { label: 'Total Events', value: meetups.length, icon: 'walk-outline', color: colors.primary },
        ].map((m) => (
          <View key={m.label} style={styles.metricCard}>
            <Ionicons name={m.icon as any} size={22} color={m.color} />
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>User Roster</Text>
      {users.map((u) => (
        <View key={u.id} style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{u.full_name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{u.full_name}</Text>
            <Text style={styles.userEmail}>{u.email}</Text>
          </View>
          <View style={[styles.badge, u.role === 'admin' ? styles.badgeAdmin : u.role === 'volunteer' ? styles.badgeVol : styles.badgeNeighbor]}>
            <Text style={styles.badgeText}>{u.role}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Manage Events ────────────────────────────────────────────────────────────
function EventsTab() {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ location: '', scheduled_time: new Date(), weather_note: '' });
  const [creating, setCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const load = useCallback(async () => {
    const m = await api.getAllMeetups();
    setMeetups(m);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCancel = async (id: string) => {
    Alert.alert('Cancel Event', 'Are you sure you want to cancel this event?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          await api.cancelMeetup(id);
          setMeetups((prev) => prev.map((m) => m.id === id ? { ...m, status: 'canceled' } : m));
        },
      },
    ]);
  };

  const handleCreate = async () => {
    if (!form.location || !form.scheduled_time) {
      Alert.alert('Missing Fields', 'Please fill in location and date/time.');
      return;
    }
    setCreating(true);
    try {
      const newMeetup = await api.createMeetup({
        location: form.location,
        scheduled_time: form.scheduled_time.toISOString(),
        status: 'active',
        weather_note: form.weather_note,
      });
      setMeetups((prev) => [...prev, newMeetup]);
      setShowCreate(false);
      setForm({ location: '', scheduled_time: new Date(), weather_note: '' });
    } catch {
      Alert.alert('Error', 'Could not create meetup.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.pageTitle}>Manage Events</Text>
          <Pressable style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>New</Text>
          </Pressable>
        </View>
        {meetups.map((m) => (
          <View key={m.id} style={styles.eventCard}>
            <View style={styles.rowBetween}>
              <View style={[styles.badge, m.status === 'active' ? styles.badgeVol : styles.badgeAlert]}>
                <Text style={[styles.badgeText, m.status === 'canceled' && { color: '#fff' }]}>
                  {m.status}
                </Text>
              </View>
              {m.status === 'active' && (
                <Pressable style={styles.cancelBtn} onPress={() => handleCancel(m.id)}>
                  <Ionicons name="close-circle-outline" size={16} color={colors.alert} />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.eventLocation}>{m.location}</Text>
            <Text style={styles.eventTime}>
              {new Date(m.scheduled_time).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
            {m.weather_note ? <Text style={styles.eventWeather}>{m.weather_note}</Text> : null}
          </View>
        ))}
      </ScrollView>

      {/* Create Modal */}
      <Modal transparent visible={showCreate} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Meetup</Text>
            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor={colors.muted}
              value={form.location}
              onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
            />
            {Platform.OS === 'web' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing.sm }}>
                {/* @ts-ignore */}
                <input
                  type="date"
                  style={{ padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flex: 1, backgroundColor: colors.background, color: colors.text, fontSize: fontSizes.md }}
                  value={form.scheduled_time.toISOString().split('T')[0]}
                  onChange={(e: any) => {
                    const newDate = new Date(form.scheduled_time);
                    const [y, m, d] = e.target.value.split('-');
                    if(y) {
                      newDate.setFullYear(parseInt(y), parseInt(m)-1, parseInt(d));
                      setForm(f => ({ ...f, scheduled_time: newDate }));
                    }
                  }}
                />
                {/* @ts-ignore */}
                <input
                  type="time"
                  style={{ padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flex: 1, backgroundColor: colors.background, color: colors.text, fontSize: fontSizes.md }}
                  value={form.scheduled_time.toTimeString().slice(0, 5)}
                  onChange={(e: any) => {
                    const newDate = new Date(form.scheduled_time);
                    const [h, min] = e.target.value.split(':');
                    if(h) {
                      newDate.setHours(parseInt(h), parseInt(min));
                      setForm(f => ({ ...f, scheduled_time: newDate }));
                    }
                  }}
                />
              </View>
            ) : Platform.OS === 'ios' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing.sm, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>Date/Time:</Text>
                <DateTimePicker
                  value={form.scheduled_time}
                  mode="datetime"
                  display="default"
                  onChange={(event, selectedDate) => {
                    const currentDate = selectedDate || form.scheduled_time;
                    setForm(f => ({ ...f, scheduled_time: currentDate }));
                  }}
                />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing.sm }}>
                <Pressable style={[styles.input, { flex: 1, marginBottom: 0, justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: colors.text }}>{form.scheduled_time.toLocaleDateString()}</Text>
                </Pressable>
                <Pressable style={[styles.input, { flex: 1, marginBottom: 0, justifyContent: 'center' }]} onPress={() => setShowTimePicker(true)}>
                  <Text style={{ color: colors.text }}>{form.scheduled_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </Pressable>
                {(showDatePicker || showTimePicker) && (
                  <DateTimePicker
                    value={form.scheduled_time}
                    mode={showDatePicker ? 'date' : 'time'}
                    display="default"
                    onChange={(event, selectedDate) => {
                      const currentDate = selectedDate || form.scheduled_time;
                      setShowDatePicker(false);
                      setShowTimePicker(false);
                      if (event.type === 'set') {
                        setForm(f => ({ ...f, scheduled_time: currentDate }));
                      }
                    }}
                  />
                )}
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Weather Note (optional)"
              placeholderTextColor={colors.muted}
              value={form.weather_note}
              onChangeText={(v) => setForm((f) => ({ ...f, weather_note: v }))}
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalCreateBtn, creating && styles.btnDisabled]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalCreateText}>Create</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Assign Roles ─────────────────────────────────────────────────────────────
const VOLUNTEER_ROLES = ['Route Marshal', 'Registration Desk', 'First Aid', 'Water Station', 'Photography', 'Sweeper'];

function RolesTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([api.getAllUsers(), api.getUpcomingMeetup()]).then(([u, m]) => {
      setUsers(u.filter((x) => x.role === 'volunteer' || x.role === 'admin'));
      setMeetup(m);
      setLoading(false);
    });
  }, []);

  const handleAssign = async (userId: string) => {
    if (!meetup || !selectedRoles[userId]) {
      Alert.alert('Select a Role', 'Please pick a role for this volunteer.');
      return;
    }
    setAssigning(userId);
    try {
      await api.assignVolunteerRole(userId, meetup.id, selectedRoles[userId]);
      Alert.alert('✅ Assigned', `Role "${selectedRoles[userId]}" assigned successfully.`);
    } catch {
      Alert.alert('Error', 'Could not assign role.');
    } finally {
      setAssigning(null);
    }
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.pageTitle}>Assign Roles</Text>
      {meetup && (
        <View style={styles.infoCard}>
          <Ionicons name="location-outline" size={15} color={colors.primary} />
          <Text style={styles.infoCardText}>Event: {meetup.location}</Text>
        </View>
      )}
      {users.map((u) => (
        <View key={u.id} style={styles.roleCard}>
          <View style={styles.roleCardTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{u.full_name.charAt(0)}</Text>
            </View>
            <Text style={styles.roleName}>{u.full_name}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
            <View style={styles.roleChipRow}>
              {VOLUNTEER_ROLES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.roleChip, selectedRoles[u.id] === r && styles.roleChipActive]}
                  onPress={() => setSelectedRoles((prev) => ({ ...prev, [u.id]: r }))}
                >
                  <Text style={[styles.roleChipText, selectedRoles[u.id] === r && styles.roleChipTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Pressable
            style={[styles.assignBtn, (assigning === u.id || !selectedRoles[u.id]) && styles.btnDisabled]}
            onPress={() => handleAssign(u.id)}
            disabled={assigning === u.id || !selectedRoles[u.id]}
          >
            {assigning === u.id
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.assignBtnText}>Assign Role</Text>}
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Approve Hours ────────────────────────────────────────────────────────────
function HoursTab() {
  const [logs, setLogs] = useState<VolunteerLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [l, u] = await Promise.all([api.getPendingVolunteerLogs(), api.getAllUsers()]);
    setLogs(l);
    setUsers(u);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string, userId: string) => {
    setActionId(id);
    await api.approveVolunteerLog(id, userId);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setActionId(null);
  };

  const handleReject = async (id: string, userId: string) => {
    setActionId(id);
    await api.rejectVolunteerLog(id, userId);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setActionId(null);
  };

  const getUserName = (uid: string) => users.find((u) => u.id === uid)?.full_name ?? uid;

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.pageTitle}>Approve Hours</Text>
      {logs.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
          <Text style={styles.emptyStateText}>All hours reviewed!</Text>
        </View>
      )}
      {logs.map((log) => (
        <View key={log.id} style={styles.hourCard}>
          <View style={styles.hourCardTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getUserName(log.user_id).charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hourName}>{getUserName(log.user_id)}</Text>
              <Text style={styles.hourRole}>{log.assigned_role}</Text>
            </View>
            <View style={styles.hoursBadge}>
              <Text style={styles.hoursBadgeText}>{log.hours_credited}h</Text>
            </View>
          </View>
          <View style={styles.hourBtns}>
            <Pressable
              style={[styles.rejectBtn, actionId === log.id && styles.btnDisabled]}
              onPress={() => handleReject(log.id, log.user_id)}
              disabled={actionId === log.id}
            >
              {actionId === log.id ? <ActivityIndicator color={colors.alert} size="small" /> : <Text style={styles.rejectBtnText}>✗ Reject</Text>}
            </Pressable>
            <Pressable
              style={[styles.approveBtn, actionId === log.id && styles.btnDisabled]}
              onPress={() => handleApprove(log.id, log.user_id)}
              disabled={actionId === log.id}
            >
              {actionId === log.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.approveBtnText}>✓ Approve</Text>}
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabBarScroll: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  tabBar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  tabChipActive: { backgroundColor: colors.primary },
  tabChipText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium },
  tabChipTextActive: { color: '#fff' },

  tabContent: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  pageTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },

  // Metrics
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  metricCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  metricValue: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold },
  metricLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },

  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: fontWeights.bold, fontSize: fontSizes.md },
  userName: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  userEmail: { fontSize: fontSizes.xs, color: colors.textSecondary },

  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.background },
  badgeAdmin: { backgroundColor: colors.secondaryLight },
  badgeVol: { backgroundColor: colors.successLight },
  badgeNeighbor: { backgroundColor: colors.primaryLight },
  badgeAlert: { backgroundColor: colors.alert },
  badgeText: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: fontWeights.medium },

  // Events tab
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  createBtnText: { color: '#fff', fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cancelBtnText: { color: colors.alert, fontSize: fontSizes.sm, fontWeight: fontWeights.medium },
  eventCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  eventLocation: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing.xs },
  eventTime: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  eventWeather: { fontSize: fontSizes.sm, color: colors.secondary, marginTop: spacing.xs },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  modalTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  modalCancelText: { color: colors.textSecondary, fontWeight: fontWeights.medium },
  modalCreateBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  modalCreateText: { color: '#fff', fontWeight: fontWeights.semibold },

  // Roles
  roleCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  roleCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roleName: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  roleChipRow: { flexDirection: 'row', gap: spacing.sm },
  roleChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  roleChipActive: { borderColor: colors.secondary, backgroundColor: colors.secondaryLight },
  roleChipText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  roleChipTextActive: { color: colors.secondary },
  assignBtn: { backgroundColor: colors.secondary, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  assignBtnText: { color: '#fff', fontWeight: fontWeights.semibold, fontSize: fontSizes.sm },

  // Hours
  hourCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  hourCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  hourName: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  hourRole: { fontSize: fontSizes.sm, color: colors.textSecondary },
  hoursBadge: { backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  hoursBadgeText: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: fontWeights.bold },
  hourBtns: { flexDirection: 'row', gap: spacing.sm },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.alert, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  rejectBtnText: { color: colors.alert, fontWeight: fontWeights.semibold },
  approveBtn: { flex: 1, backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: fontWeights.semibold },
  btnDisabled: { opacity: 0.5 },

  infoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  infoCardText: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: fontWeights.medium },

  emptyState: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  emptyStateText: { fontSize: fontSizes.lg, color: colors.success, fontWeight: fontWeights.semibold },
});
