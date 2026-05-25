import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { VolunteerLog } from '../../types';
import { colors, fontSizes, fontWeights, radius, shadows, spacing } from '../../constants/theme';

export default function VolunteerScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<VolunteerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      <ScrollView
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
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
    </SafeAreaView>
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
});
