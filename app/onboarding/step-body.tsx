import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { OnboardingButton } from '@/components/ui/OnboardingButton';
import { ACTIVITY_LEVEL_LABELS, type ActivityLevel } from '@/lib/macroCalculator';

const SEX_OPTIONS = [
  { key: 'male', label: 'Male', emoji: '♂️' },
  { key: 'female', label: 'Female', emoji: '♀️' },
];

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string; emoji: string }[] = [
  { key: 'sedentary', label: 'Sedentary', emoji: '🪑' },
  { key: 'lightly_active', label: 'Lightly Active', emoji: '🚶' },
  { key: 'moderately_active', label: 'Moderately Active', emoji: '🏃' },
  { key: 'very_active', label: 'Very Active', emoji: '🏋️' },
  { key: 'extra_active', label: 'Extra Active', emoji: '🏆' },
];

export default function StepBodyScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    diet: string;
    goal: string;
    allergies: string;
    dislikes: string;
  }>();

  const [sex, setSex] = useState<string | null>(null);
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState<string | null>(null);

  const selectedActivity = activityLevel as ActivityLevel | null;
  const activityDesc = selectedActivity
    ? ACTIVITY_LEVEL_LABELS[selectedActivity].description
    : null;

  // Validate inputs
  const dayNum = parseInt(dobDay, 10);
  const monthNum = parseInt(dobMonth, 10);
  const yearNum = parseInt(dobYear, 10);
  const heightNum = parseFloat(heightCm);
  const weightNum = parseFloat(weightKg);

  const isDobValid =
    dayNum >= 1 &&
    dayNum <= 31 &&
    monthNum >= 1 &&
    monthNum <= 12 &&
    yearNum >= 1920 &&
    yearNum <= new Date().getFullYear() - 13;

  const isHeightValid = heightNum >= 100 && heightNum <= 250;
  const isWeightValid = weightNum >= 30 && weightNum <= 300;

  const canContinue = sex && isDobValid && isHeightValid && isWeightValid && activityLevel;

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
    >
      <StepIndicator total={5} current={2} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>About you</Text>
        <Text style={styles.subtitle}>
          We'll use this to calculate your ideal calorie and macro targets using the Mifflin-St Jeor
          equation.
        </Text>

        {/* Biological Sex */}
        <Text style={styles.sectionTitle}>Biological sex</Text>
        <Text style={styles.hint}>Used for metabolic rate calculation</Text>
        <View style={styles.chipGrid}>
          {SEX_OPTIONS.map((s) => (
            <SelectableChip
              key={s.key}
              label={`${s.emoji} ${s.label}`}
              selected={sex === s.key}
              onPress={() => setSex(s.key)}
            />
          ))}
        </View>

        {/* Date of Birth */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Date of birth</Text>
        <View style={styles.dobRow}>
          <View style={styles.dobField}>
            <Text style={styles.dobLabel}>Day</Text>
            <TextInput
              style={styles.dobInput}
              value={dobDay}
              onChangeText={(t) => setDobDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              placeholder="DD"
              placeholderTextColor="#9CA3AF"
              maxLength={2}
            />
          </View>
          <View style={styles.dobField}>
            <Text style={styles.dobLabel}>Month</Text>
            <TextInput
              style={styles.dobInput}
              value={dobMonth}
              onChangeText={(t) => setDobMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor="#9CA3AF"
              maxLength={2}
            />
          </View>
          <View style={[styles.dobField, { flex: 1.5 }]}>
            <Text style={styles.dobLabel}>Year</Text>
            <TextInput
              style={styles.dobInput}
              value={dobYear}
              onChangeText={(t) => setDobYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="YYYY"
              placeholderTextColor="#9CA3AF"
              maxLength={4}
            />
          </View>
        </View>

        {/* Height & Weight */}
        <View style={styles.measureRow}>
          <View style={styles.measureField}>
            <Text style={styles.sectionTitle}>Height</Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={styles.measureInput}
                value={heightCm}
                onChangeText={(t) => setHeightCm(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="175"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.unitLabel}>cm</Text>
            </View>
          </View>
          <View style={styles.measureField}>
            <Text style={styles.sectionTitle}>Weight</Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={styles.measureInput}
                value={weightKg}
                onChangeText={(t) => setWeightKg(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="75"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.unitLabel}>kg</Text>
            </View>
          </View>
        </View>

        {/* Activity Level */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Activity level</Text>
        <View style={styles.chipGrid}>
          {ACTIVITY_OPTIONS.map((a) => (
            <SelectableChip
              key={a.key}
              label={`${a.emoji} ${a.label}`}
              selected={activityLevel === a.key}
              onPress={() => setActivityLevel(a.key)}
            />
          ))}
        </View>
        {activityDesc && <Text style={styles.activityHint}>{activityDesc}</Text>}
      </ScrollView>

      <View style={styles.bottom}>
        <OnboardingButton
          label="Calculate my targets"
          onPress={() =>
            router.push({
              pathname: '/onboarding/step-macros',
              params: {
                ...params,
                sex,
                dobDay,
                dobMonth,
                dobYear,
                heightCm,
                weightKg,
                activityLevel,
              },
            })
          }
          disabled={!canContinue}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
  },
  scroll: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dobRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  dobField: {
    flex: 1,
  },
  dobLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dobInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  measureRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  measureField: {
    flex: 1,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  measureInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 4,
  },
  activityHint: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  bottom: {
    paddingTop: 12,
  },
});
