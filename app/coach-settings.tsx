import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/providers/AuthProvider';
import { useTasteProfile } from '@/hooks/useTasteProfile';
import { supabase } from '@/lib/supabase';
import { brand } from '@/constants/Colors';

const CUISINES = [
  'Mediterranean',
  'Italian',
  'Mexican',
  'Japanese',
  'Indian',
  'Thai',
  'Chinese',
  'Korean',
  'British',
  'American',
  'French',
  'Vietnamese',
  'Middle Eastern',
  'Greek',
];

const SPICE_TOLERANCE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' },
  { value: 'extra_hot', label: 'Extra Hot' },
];

const COOKING_SKILL_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
];

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'premium', label: 'Premium' },
];

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <View style={styles.numberInputRow}>
      <Text style={styles.numberInputLabel}>{label}</Text>
      <View style={styles.numberInputControl}>
        <TouchableOpacity
          style={styles.numberBtn}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={styles.numberBtnText}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.numberInputField}
          value={String(value)}
          onChangeText={(t) => {
            const n = parseInt(t, 10);
            if (!isNaN(n)) onChange(Math.max(min, n));
          }}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        <TouchableOpacity
          style={styles.numberBtn}
          onPress={() => onChange(value + step)}
        >
          <Text style={styles.numberBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CoachSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { tasteProfile, isLoading, refetch } = useTasteProfile();
  const [saving, setSaving] = useState(false);

  // Form state
  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [avoidedIngredients, setAvoidedIngredients] = useState('');
  const [spiceTolerance, setSpiceTolerance] = useState<string | null>(null);
  const [cookingSkill, setCookingSkill] = useState<string | null>(null);
  const [maxPrepTime, setMaxPrepTime] = useState(30);
  const [budgetPreference, setBudgetPreference] = useState<string | null>(null);
  const [householdSize, setHouseholdSize] = useState(1);

  useEffect(() => {
    if (tasteProfile) {
      setPreferredCuisines(tasteProfile.preferred_cuisines || []);
      setAvoidedIngredients((tasteProfile.avoided_ingredients || []).join(', '));
      setSpiceTolerance(tasteProfile.spice_tolerance || null);
      setCookingSkill(tasteProfile.cooking_skill || null);
      setMaxPrepTime(tasteProfile.max_prep_time_min || 30);
    }
  }, [tasteProfile]);

  const toggleCuisine = (cuisine: string) => {
    setPreferredCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const avoidedList = avoidedIngredients
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const { error } = await supabase
      .from('user_taste_profile')
      .update({
        preferred_cuisines: preferredCuisines,
        avoided_ingredients: avoidedList,
        spice_tolerance: spiceTolerance,
        cooking_skill: cookingSkill as any,
        max_prep_time_min: maxPrepTime,
        budget_preference: budgetPreference,
        household_size: householdSize,
      })
      .eq('user_id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await refetch();
      Alert.alert('Saved!', 'Your AI Coach settings have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  if (isLoading && !tasteProfile) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Coach Settings</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={brand.primary} />
            ) : (
              <Text style={[styles.headerBtnText, { color: brand.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card>
            <Text style={styles.sectionTitle}>PREFERRED CUISINES</Text>
            <View style={styles.chipGrid}>
              {CUISINES.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine}
                  style={[
                    styles.chip,
                    preferredCuisines.includes(cuisine) && styles.chipActive,
                  ]}
                  onPress={() => toggleCuisine(cuisine)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      preferredCuisines.includes(cuisine) && styles.chipTextActive,
                    ]}
                  >
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>AVOIDED INGREDIENTS</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 60 }]}
              value={avoidedIngredients}
              onChangeText={setAvoidedIngredients}
              placeholder="e.g. Peanuts, Shellfish, Dairy (comma separated)"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>SPICE TOLERANCE</Text>
            <View style={styles.chipGrid}>
              {SPICE_TOLERANCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, spiceTolerance === option.value && styles.chipActive]}
                  onPress={() => setSpiceTolerance(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      spiceTolerance === option.value && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>COOKING SKILL</Text>
            <View style={styles.chipGrid}>
              {COOKING_SKILL_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, cookingSkill === option.value && styles.chipActive]}
                  onPress={() => setCookingSkill(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      cookingSkill === option.value && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>MAX PREP TIME</Text>
            <NumberInput
              label="Minutes"
              value={maxPrepTime}
              onChange={setMaxPrepTime}
              step={5}
              min={0}
            />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>BUDGET PREFERENCE</Text>
            <View style={styles.chipGrid}>
              {BUDGET_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, budgetPreference === option.value && styles.chipActive]}
                  onPress={() => setBudgetPreference(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      budgetPreference === option.value && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>HOUSEHOLD SIZE</Text>
            <NumberInput
              label="People"
              value={householdSize}
              onChange={setHouseholdSize}
              step={1}
              min={1}
            />
          </Card>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: { minWidth: 60 },
  headerBtnText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: brand.primaryBg, borderColor: brand.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: brand.primary },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  numberInputLabel: { fontSize: 15, color: '#374151', fontWeight: '500', flex: 1 },
  numberInputControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numberBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBtnText: { fontSize: 18, fontWeight: '600', color: '#374151' },
  numberInputField: {
    width: 56,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
