import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../services/api';
import { RSVP } from '../types';
import { colors, fontSizes, fontWeights, radius, spacing } from '../constants/theme';

interface AttendeeListModalProps {
  visible: boolean;
  onClose: () => void;
  meetupId?: string;
}

export default function AttendeeListModal({ visible, onClose, meetupId }: AttendeeListModalProps) {
  const insets = useSafeAreaInsets();
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && meetupId) {
      setLoading(true);
      api.getRSVPsForMeetup(meetupId)
        .then(data => {
          // Only show those who RSVP'd "going"
          const going = data.filter(r => r.intent === 'going');
          // Sort by attended first, then by name
          going.sort((a, b) => {
            if (a.attended === b.attended) {
              return (a.user_full_name || '').localeCompare(b.user_full_name || '');
            }
            return a.attended ? -1 : 1;
          });
          setRsvps(going);
        })
        .catch(err => console.warn('Failed to fetch RSVPs', err))
        .finally(() => setLoading(false));
    }
  }, [visible, meetupId]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Attendees</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} />
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {rsvps.length === 0 ? (
                <Text style={styles.emptyText}>No attendees have RSVP'd yet.</Text>
              ) : (
                rsvps.map(rsvp => (
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
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
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
