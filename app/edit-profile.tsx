import React, { useState, useEffect, useRef } from 'react';
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
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { brand, macros as macroColors } from '@/constants/Colors';
import {
  calculateMacros,
  ACTIVITY_LEVEL_LABELS,
  type Sex,
  type ActivityLevel,
  type Goal,
} from '@/lib/macroCalculator';

// ---------------------------------------------------------------------------
// Diet types — key is what's stored in DB, label is what's displayed
// key=null means "No Restriction" (stored as null in DB)
// ---------------------------------------------------------------------------
const DIET_OPTIONS: { key: string | null; label: string }[] = [
  { key: null, label: 'No Restriction' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'keto', label: 'Keto' },
  { key: 'paleo', label: 'Paleo' },
  { key: 'carnivore', label: 'Carnivore' },
  { key: 'mediterranean', label: 'Mediterranean' },
  { key: 'gluten_free', label: 'Gluten Free' },
  { key: 'dairy_free', label: 'Dairy Free' },
  { key: 'low_fodmap', label: 'Low FODMAP' },
];

const GOALS = [
  'lose_weight',
  'maintain_weight',
  'gain_muscle',
  'improve_health',
  'increase_energy',
  'eat_cleaner',
];

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose Weight',
  maintain_weight: 'Maintain Weight',
  gain_muscle: 'Gain Muscle',
  improve_health: 'Improve Health',
  increase_energy: 'Increase Energy',
  eat_cleaner: 'Eat Cleaner',
};

type MacroPreset = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  hint: string;
};

const GOAL_PRESETS: Record<string, MacroPreset> = {
  lose_weight: {
    calories: 1700, protein: 140, carbs: 130, fat: 55, fibre: 30,
    hint: 'Lower calorie, high protein to preserve muscle',
  },
  maintain_weight: {
    calories: 2100, protein: 130, carbs: 220, fat: 70, fibre: 30,
    hint: 'Balanced macros for weight maintenance',
  },
  gain_muscle: {
    calories: 2600, protein: 180, carbs: 280, fat: 80, fibre: 35,
    hint: 'High protein & calorie surplus for muscle growth',
  },
  improve_health: {
    calories: 2000, protein: 120, carbs: 200, fat: 70, fibre: 35,
    hint: 'Balanced whole-food nutrition with extra fibre',
  },
  increase_energy: {
    calories: 2200, protein: 120, carbs: 260, fat: 70, fibre: 30,
    hint: 'Higher carbs for sustained energy all day',
  },
  eat_cleaner: {
    calories: 1900, protein: 130, carbs: 180, fat: 65, fibre: 38,
    hint: 'Nutrient-dense, high fibre, minimally processed',
  },
};

// ---------------------------------------------------------------------------
// MacroInput component
// ---------------------------------------------------------------------------
function MacroInput({
  label,
  value,
  onChange,
  color,
  unit = 'g',
  step = 5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  unit?: string;
  step?: number;
}) {
  return (
    <View style={styles.macroInputRow}>
      <View style={[styles.macroColorDot, { backgroundColor: color }]} />
      <Text style={styles.macroInputLabel}>{label}</Text>
      <View style={styles.macroInputControl}>
        <TouchableOpacity
          style={styles.macroBtn}
          onPress={() => onChange(Math.max(0, value - step))}
          activeOpacity={0.6}
        >
          <Text style={styles.macroBtnText}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.macroInputField}
          value={String(value)}
          onChangeText={(t) => {
            const n = parseInt(t, 10);
            if (!isNaN(n) && n >= 0) onChange(n);
            else if (t === '') onChange(0);
          }}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        <TouchableOpacity
          style={styles.macroBtn}
          onPress={() => onChange(value + step)}
          activeOpacity={0.6}
        >
          <Text style={styles.macroBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.macroUnit}>{unit}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// EditProfileScreen
// ---------------------------------------------------------------------------
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const [saving, setSaving] = useState(false);

  // Track whether we've already populated the form from the profile.
  // This prevents useEffect from overwriting user edits on every re-render,
  // since `profile` is a new object reference each time useProfile runs.
  const hasPopulated = useRef(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [dietKey, setDietKey] = useState<string | null>(null); // DB key, or null = "No Restriction"
  const [goal, setGoal] = useState('improve_health');
  const [calories, setCalories] = useState(2100);
  const [protein, setProtein] = useState(150);
  const [carbs, setCarbs] = useState(200);
  const [fat, setFat] = useState(70);
  const [fibre, setFibre] = useState(30);
  const [allergies, setAllergies] = useState('');
  const [hasCustomisedMacros, setHasCustomisedMacros] = useState(false);

  // Body stats
  const [sex, setSex] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState<string | null>(null);
  const [dobStr, setDobStr] = useState(''); // stored as YYYY-MM-DD

  const canRecalculate = sex && heightCm && weightKg && activityLevel && dobStr;

  const handleRecalculate = () => {
    if (!canRecalculate) return;
    const dob = new Date(dobStr);
    const targets = calculateMacros({
      weightKg: parseFloat(weightKg),
      heightCm: parseFloat(heightCm),
      dateOfBirth: dob,
      sex: sex as Sex,
      activityLevel: activityLevel as ActivityLevel,
      goal: goal as Goal,
    });
    setCalories(targets.calories);
    setProtein(targets.protein);
    setCarbs(targets.carbs);
    setFat(targets.fat);
    setFibre(targets.fibre);
    setHasCustomisedMacros(false);
  };

  const handleGoalSelect = (g: string) => {
    setGoal(g);
    // Auto-populate macro targets from the preset unless user has manually tweaked them
    const preset = GOAL_PRESETS[g];
    if (preset && !hasCustomisedMacros) {
      setCalories(preset.calories);
      setProtein(preset.protein);
      setCarbs(preset.carbs);
      setFat(preset.fat);
      setFibre(preset.fibre);
    }
  };

  // Wrap macro setters to track manual customisation
  const handleCalories = (v: number) => { setCalories(v); setHasCustomisedMacros(true); };
  const handleProtein = (v: number) => { setProtein(v); setHasCustomisedMacros(true); };
  const handleCarbs = (v: number) => { setCarbs(v); setHasCustomisedMacros(true); };
  const handleFat = (v: number) => { setFat(v); setHasCustomisedMacros(true); };
  const handleFibre = (v: number) => { setFibre(v); setHasCustomisedMacros(true); };

  // Populate form from profile — only ONCE when profile first becomes available.
  // Without this guard, every render creates a new `profile` object reference,
  // which triggers useEffect and resets all form state (making editing impossible).
  useEffect(() => {
    if (profile && !hasPopulated.current) {
      hasPopulated.current = true;
      setDisplayName(profile.display_name || '');
      // DB stores dietary_preference as snake_case string, or null for "No Restriction"
      setDietKey(profile.dietary_preference || null);
      setGoal(profile.goal || 'improve_health');
      setCalories(profile.daily_calorie_target || 2100);
      setProtein(profile.daily_protein_g || 150);
      setCarbs(profile.daily_carbs_g || 200);
      setFat(profile.daily_fat_g || 70);
      setFibre(profile.daily_fibre_g || 30);
      setAllergies((profile.allergies || []).join(', '));
      // Body stats
      setSex(profile.sex || null);
      setHeightCm(profile.height_cm ? String(profile.height_cm) : '');
      setWeightKg(profile.weight_kg ? String(profile.weight_kg) : '');
      setActivityLevel(profile.activity_level || null);
      setDobStr(profile.date_of_birth || '');
      // Profile already has values — mark macros as customised so switching
      // goal doesn't unexpectedly overwrite them
      setHasCustomisedMacros(true);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const allergyList = allergies
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName.trim() || 'User',
        sex: sex || null,
        date_of_birth: dobStr || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        activity_level: activityLevel || null,
        dietary_preference: dietKey as any, // already stored as DB key
        goal: goal as any,
        daily_calorie_target: calories,
        daily_protein_g: protein,
        daily_carbs_g: carbs,
        daily_fat_g: fat,
        daily_fibre_g: fibre,
        allergies: allergyList,
      }, { onConflict: 'id' });

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Allow re-population on next mount
      hasPopulated.current = false;
      await refetch();
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={brand.primary} />
            ) : (
              <Text style={[styles.headerBtnText, { color: brand.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Card>
            <Text style={styles.sectionTitle}>DISPLAY NAME</Text>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
              returnKeyType="done"
            />
          </Card>

          {/* Body Stats */}
          <Card>
            <Text style={styles.sectionTitle}>BODY STATS</Text>
            <View style={styles.chipGrid}>
              <TouchableOpacity
                style={[styles.chip, sex === 'male' && styles.chipActive]}
                onPress={() => setSex('male')}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, sex === 'male' && styles.chipTextActive]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, sex === 'female' && styles.chipActive]}
                onPress={() => setSex('female')}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, sex === 'female' && styles.chipTextActive]}>Female</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bodyLabel}>DOB</Text>
                <TextInput
                  style={styles.textInput}
                  value={dobStr}
                  onChangeText={setDobStr}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bodyLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="175"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bodyLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="75"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text style={[styles.bodyLabel, { marginTop: 12 }]}>Activity Level</Text>
            <View style={styles.chipGrid}>
              {(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'] as const).map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.chip, activityLevel === a && styles.chipActive]}
                  onPress={() => setActivityLevel(a)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, activityLevel === a && styles.chipTextActive]}>
                    {ACTIVITY_LEVEL_LABELS[a].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {canRecalculate && (
              <TouchableOpacity
                onPress={handleRecalculate}
                style={{ marginTop: 14, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: brand.primaryBg, borderRadius: 12, borderWidth: 1, borderColor: brand.primary }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: brand.primary }}>
                  Recalculate macros from my stats
                </Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Diet type */}
          <Card>
            <Text style={styles.sectionTitle}>DIET TYPE</Text>
            <View style={styles.chipGrid}>
              {DIET_OPTIONS.map((d) => {
                const isSelected = dietKey === d.key;
                return (
                  <TouchableOpacity
                    key={d.label}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setDietKey(d.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Goal */}
          <Card>
            <Text style={styles.sectionTitle}>GOAL</Text>
            <View style={styles.chipGrid}>
              {GOALS.map((g) => {
                const isSelected = goal === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => handleGoalSelect(g)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {GOAL_LABELS[g]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {GOAL_PRESETS[goal] && (
              <View style={styles.goalHintRow}>
                <Text style={styles.goalHintText}>{GOAL_PRESETS[goal].hint}</Text>
                {hasCustomisedMacros && (
                  <TouchableOpacity
                    onPress={() => {
                      const p = GOAL_PRESETS[goal];
                      setCalories(p.calories);
                      setProtein(p.protein);
                      setCarbs(p.carbs);
                      setFat(p.fat);
                      setFibre(p.fibre);
                      setHasCustomisedMacros(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.goalResetText}>Reset to defaults</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Card>

          {/* Macro targets */}
          <Card>
            <Text style={styles.sectionTitle}>DAILY TARGETS</Text>
            <MacroInput
              label="Calories"
              value={calories}
              onChange={handleCalories}
              color="#111827"
              unit="kcal"
              step={50}
            />
            <MacroInput
              label="Protein"
              value={protein}
              onChange={handleProtein}
              color={macroColors.protein}
            />
            <MacroInput label="Carbs" value={carbs} onChange={handleCarbs} color={macroColors.carbs} />
            <MacroInput label="Fat" value={fat} onChange={handleFat} color={macroColors.fat} />
            <MacroInput label="Fibre" value={fibre} onChange={handleFibre} color={macroColors.fibre} />
          </Card>

          {/* Allergies */}
          <Card>
            <Text style={styles.sectionTitle}>ALLERGIES & INTOLERANCES</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 60 }]}
              value={allergies}
              onChangeText={setAllergies}
              placeholder="e.g. Dairy, Nuts, Shellfish (comma separated)"
              placeholderTextColor="#9CA3AF"
              multiline
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
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  macroColorDot: { width: 10, height: 10, borderRadius: 5 },
  macroInputLabel: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },
  macroInputControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroBtnText: { fontSize: 18, fontWeight: '600', color: '#374151' },
  macroInputField: {
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  macroUnit: { fontSize: 13, color: '#9CA3AF', width: 28 },
  goalHintRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  goalHintText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    flex: 1,
  },
  goalResetText: {
    fontSize: 12,
    fontWeight: '600',
    color: brand.primary,
  },
  bodyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
});
