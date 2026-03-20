import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { OnboardingButton } from '@/components/ui/OnboardingButton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const CUISINES = [
  'Italian', 'Mexican', 'Japanese', 'Indian', 'Thai',
  'Mediterranean', 'Chinese', 'Korean', 'British',
  'Middle Eastern', 'Greek', 'French', 'Vietnamese', 'American',
];

const SPICE_LEVELS = [
  { key: 'none', label: '🧊 None' },
  { key: 'mild', label: '🌶️ Mild' },
  { key: 'medium', label: '🌶️🌶️ Medium' },
  { key: 'hot', label: '🔥 Hot' },
  { key: 'extra_hot', label: '🔥🔥 Extra Hot' },
];

const SKILL_LEVELS = [
  { key: 'easy', label: '🔰 Beginner' },
  { key: 'medium', label: '👨‍🍳 Intermediate' },
  { key: 'hard', label: '⭐ Advanced' },
  { key: 'expert', label: '🏆 Expert' },
];

const TIME_PREFS = [
  { key: '15', label: '⚡ Under 15 min' },
  { key: '30', label: '🕐 Under 30 min' },
  { key: '60', label: '🕐 Under 60 min' },
  { key: '999', label: '♾️ No limit' },
];

export default function StepTasteScreen() {
  const insets = useSafeAreaInsets();
  const { user, completeOnboarding } = useAuth();
  const params = useLocalSearchParams<{
    diet: string;
    goal: string;
    allergies: string;
    dislikes: string;
    sex: string;
    dobDay: string;
    dobMonth: string;
    dobYear: string;
    heightCm: string;
    weightKg: string;
    activityLevel: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    fibre: string;
  }>();

  const [cuisines, setCuisines] = useState<string[]>([]);
  const [spice, setSpice] = useState<string | null>(null);
  const [skill, setSkill] = useState<string | null>(null);
  const [maxTime, setMaxTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggleCuisine = (c: string) => {
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const allergies = JSON.parse(params.allergies || '[]');
      const dislikes = JSON.parse(params.dislikes || '[]');

      // Build date of birth from day/month/year params
      const dobYear = parseInt(params.dobYear || '0', 10);
      const dobMonth = parseInt(params.dobMonth || '0', 10);
      const dobDay = parseInt(params.dobDay || '0', 10);
      const dateOfBirth = (dobYear && dobMonth && dobDay)
        ? `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`
        : null;

      // Upsert profile (row may not exist yet — Supabase doesn't always auto-create it)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          sex: params.sex || null,
          date_of_birth: dateOfBirth,
          height_cm: params.heightCm ? parseFloat(params.heightCm) : null,
          weight_kg: params.weightKg ? parseFloat(params.weightKg) : null,
          activity_level: params.activityLevel || null,
          dietary_preference: params.diet as any,
          goal: params.goal as any,
          daily_calorie_target: parseInt(params.calories || '2100'),
          daily_protein_g: parseFloat(params.protein || '150'),
          daily_carbs_g: parseFloat(params.carbs || '200'),
          daily_fat_g: parseFloat(params.fat || '70'),
          daily_fibre_g: parseFloat(params.fibre || '30'),
          allergies,
          disliked_ingredients: dislikes,
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // Upsert taste profile (row may not exist yet during onboarding)
      const { error: tasteError } = await supabase
        .from('user_taste_profile')
        .upsert({
          user_id: user.id,
          preferred_cuisines: cuisines,
          avoided_ingredients: dislikes,
          spice_tolerance: spice as any,
          cooking_skill: skill as any,
          max_prep_time_min: maxTime ? parseInt(maxTime) : null,
        }, { onConflict: 'user_id' });

      if (tasteError) throw tasteError;

      // Mark onboarding complete BEFORE navigating — prevents auth gate redirect loop
      completeOnboarding();
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error saving', error.message || 'Something went wrong. You can update these later in settings.');
      completeOnboarding();
      router.replace('/(tabs)');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <StepIndicator total={5} current={4} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your taste profile</Text>
        <Text style={styles.subtitle}>Help your AI coach learn what you love.</Text>

        {/* Cuisines */}
        <Text style={styles.sectionTitle}>Favourite cuisines</Text>
        <Text style={styles.hint}>
          Pick at least 2 — we'll prioritise these in your Discover feed and meal suggestions.
        </Text>
        <View style={styles.chipGrid}>
          {CUISINES.map((c) => (
            <SelectableChip
              key={c}
              label={c}
              selected={cuisines.includes(c)}
              onPress={() => toggleCuisine(c)}
            />
          ))}
        </View>
        {cuisines.length > 0 && (
          <Text style={styles.selectedCount}>{cuisines.length} selected</Text>
        )}

        {/* Spice */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Spice tolerance</Text>
        <View style={styles.chipGrid}>
          {SPICE_LEVELS.map((s) => (
            <SelectableChip
              key={s.key}
              label={s.label}
              selected={spice === s.key}
              onPress={() => setSpice(s.key)}
            />
          ))}
        </View>

        {/* Cooking skill */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Cooking skill level</Text>
        <View style={styles.chipGrid}>
          {SKILL_LEVELS.map((s) => (
            <SelectableChip
              key={s.key}
              label={s.label}
              selected={skill === s.key}
              onPress={() => setSkill(s.key)}
            />
          ))}
        </View>

        {/* Max time */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Max cooking time</Text>
        <View style={styles.chipGrid}>
          {TIME_PREFS.map((t) => (
            <SelectableChip
              key={t.key}
              label={t.label}
              selected={maxTime === t.key}
              onPress={() => setMaxTime(t.key)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        {cuisines.length < 2 && (
          <OnboardingButton
            label="Skip for now"
            onPress={handleFinish}
            loading={isSaving}
            variant="secondary"
          />
        )}
        <OnboardingButton
          label={cuisines.length >= 2 ? 'Finish setup' : `Pick ${2 - cuisines.length} more cuisine${cuisines.length === 1 ? '' : 's'}`}
          onPress={handleFinish}
          loading={isSaving}
          disabled={cuisines.length < 2}
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
  selectedCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bottom: {
    paddingTop: 12,
  },
});
