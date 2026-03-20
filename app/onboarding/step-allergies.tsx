import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { OnboardingButton } from '@/components/ui/OnboardingButton';

const COMMON_ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Wheat',
  'Soy', 'Fish', 'Shellfish', 'Sesame', 'Celery',
  'Mustard', 'Lupin', 'Sulphites',
];

const COMMON_DISLIKES = [
  'Mushrooms', 'Olives', 'Anchovies', 'Blue Cheese',
  'Beetroot', 'Coriander', 'Liver', 'Tofu',
  'Aubergine', 'Brussels Sprouts', 'Okra', 'Coconut',
];

export default function StepAllergiesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ diet: string; goal: string }>();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');

  const toggle = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const addCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
    }
    setCustomAllergy('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <StepIndicator total={5} current={1} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Any allergies?</Text>
        <Text style={styles.subtitle}>We'll make sure these never appear in suggestions.</Text>

        <View style={styles.chipGrid}>
          {COMMON_ALLERGIES.map((a) => (
            <SelectableChip
              key={a}
              label={a}
              selected={allergies.includes(a)}
              onPress={() => toggle(a, allergies, setAllergies)}
            />
          ))}
        </View>

        <TextInput
          style={styles.customInput}
          placeholder="Add other allergy..."
          placeholderTextColor="#9CA3AF"
          value={customAllergy}
          onChangeText={setCustomAllergy}
          onSubmitEditing={addCustomAllergy}
          returnKeyType="done"
        />

        <Text style={[styles.title, { marginTop: 28 }]}>Foods you dislike?</Text>
        <Text style={styles.subtitle}>We'll avoid these in AI recommendations.</Text>

        <View style={styles.chipGrid}>
          {COMMON_DISLIKES.map((d) => (
            <SelectableChip
              key={d}
              label={d}
              selected={dislikes.includes(d)}
              onPress={() => toggle(d, dislikes, setDislikes)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <OnboardingButton
          label="Next"
          onPress={() =>
            router.push({
              pathname: '/onboarding/step-body',
              params: {
                ...params,
                allergies: JSON.stringify(allergies),
                dislikes: JSON.stringify(dislikes),
              },
            })
          }
        />
        <OnboardingButton
          label="No allergies or dislikes"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/onboarding/step-body',
              params: { ...params, allergies: '[]', dislikes: '[]' },
            })
          }
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
  customInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginTop: 12,
  },
  bottom: {
    paddingTop: 12,
    gap: 4,
  },
});
