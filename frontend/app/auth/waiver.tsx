import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { colors, fontSizes, fontWeights, radius, shadows, spacing } from '../../constants/theme';

const WAIVER_TEXT = `CASUAL MEETUP & LIABILITY WAIVER

Neighborhood Stride Community Walking Program

Last Updated: January 1, 2026

By participating in any Neighborhood Stride event, you ("Participant") agree to the following terms and conditions. Please read this waiver carefully before participating.

1. ASSUMPTION OF RISK
Participant acknowledges that walking, jogging, and related physical activities involve inherent risks, including but not limited to physical injury, illness, or property damage. Participant voluntarily assumes all such risks, both known and unknown.

2. RELEASE OF LIABILITY
To the fullest extent permitted by applicable law, Participant releases and discharges Neighborhood Stride, its organizers, volunteers, and affiliates from any and all claims, demands, or causes of action arising from participation in any Neighborhood Stride event.

3. MEDICAL AUTHORIZATION
Participant represents that they are in good physical condition and have no medical conditions that would prevent their participation. In the event of a medical emergency, Participant consents to emergency medical treatment.

4. PHOTOGRAPHS & MEDIA
Participant grants Neighborhood Stride permission to use photographs, videos, or other media taken during events for promotional or community purposes.

5. VOLUNTEER CONDUCT
Volunteer participants agree to perform their assigned duties responsibly and to follow all guidelines set forth by event organizers. Hours credited are subject to verification and approval by program administrators.

6. CODE OF CONDUCT
All participants agree to treat fellow community members with respect and courtesy. Harassment, intimidation, or unsafe behavior will result in removal from the program.

7. GOVERNING LAW
This waiver shall be governed by the laws of the applicable jurisdiction. Any disputes shall be resolved through binding arbitration.

8. ACKNOWLEDGMENT
By checking the box and clicking "Agree & Continue," Participant acknowledges that they have read, understood, and agree to be bound by the terms of this waiver.`;

export default function WaiverScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAgree = async () => {
    if (!agreed) {
      Alert.alert('Checkbox Required', 'Please read and check the box to continue.');
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const updated = await api.updateWaiverStatus(user.id);
      refreshUser(updated);
      router.replace('/(app)/dashboard');
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.waiverBox}>
          <Text style={styles.waiverText}>{WAIVER_TEXT}</Text>
        </View>

        {/* Mandatory checkbox */}
        <Pressable style={styles.checkRow} onPress={() => setAgreed((v) => !v)}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkLabel}>
            I have read and I agree to the Casual Meetup & Liability Waiver.
          </Text>
        </Pressable>

        <Pressable
          style={[styles.agreeBtn, (!agreed || isLoading) && styles.btnDisabled]}
          onPress={handleAgree}
          disabled={!agreed || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.agreeBtnText}>Agree &amp; Continue</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing['2xl'] },

  waiverBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
    marginBottom: spacing.md,
    maxHeight: 420,
  },
  waiverText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 22,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkLabel: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 22,
  },

  agreeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  agreeBtnText: {
    color: '#fff',
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  btnDisabled: { opacity: 0.5 },
});
