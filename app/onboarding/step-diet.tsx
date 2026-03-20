import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { OnboardingButton } from '@/components/ui/OnboardingButton';

const DIETS = [
  { key: 'carnivore', label: '🥩 Carnivore' },
  { key: 'omnivore', label: '🍖 Omnivore' },
  { key: 'vegetarian', label: '🥚 Vegetarian' },
  { key: 'vegan', label: '🌱 Vegan' },
  { key: 'pescatarian', label: '🐟 Pescatarian' },
  { key: 'keto', label: '🥑 Keto' },
  { key: 'paleo', label: '🦴 Paleo' },
  { key: 'mediterranean', label: '🫒 Mediterranean' },
  { key: 'gluten_free', label: '🌾 Gluten Free' },
  { key: 'dairy_free', label: '🥛 Dairy Free' },
  { key: 'low_fodmap', label: '🫘 Low FODMAP' },
];

const GOALS = [
  { key: 'lose_weight', label: '⬇️ Lose weight' },
  { key: 'maintain_weight', label: '⚖️ Maintain weight' },
  { key: 'gain_weight', label: '⬆️ Gain weight' },
  { key: 'build_muscle', label: '💪 Build muscle' },
  { key: 'improve_health', label: '❤️ Improve health' },
  { key: 'increase_energy', label: '⚡ Increase energy' },
];

export default function StepDietScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
    >
      <StepIndicator total={5} current={0} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How do you eat?</Text>
        <Text style={styles.subtitle}>Pick the diet that best describes you.</Text>

        <View style={styles.chipGrid}>
          {DIETS.map((d) => (
            <SelectableChip
              key={d.key}
              label={d.label}
              selected={selectedDiet === d.key}
              onPress={() => setSelectedDiet(d.key)}
            />
          ))}
        </View>

        <Text style={[styles.title, { marginTop: 32 }]}>What's your goal?</Text>
        <Text style={styles.subtitle}>We'll tailor your macro targets and suggestions.</Text>

        <View style={styles.chipGrid}>
          {GOALS.map((g) => (
            <SelectableChip
              key={g.key}
              label={g.label}
              selected={selectedGoal === g.key}
              onPress={() => setSelectedGoal(g.key)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <OnboardingButton
          label="Next"
          onPress={() =>
            router.push({
              pathname: '/onboarding/step-allergies',
              params: { diet: selectedDiet || 'omnivore', goal: selectedGoal || 'improve_health' },
            })
          }
          disabled={!selectedDiet || !selectedGoal}
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
    marginBottom: 16,
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
