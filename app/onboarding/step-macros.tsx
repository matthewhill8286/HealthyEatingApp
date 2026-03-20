import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { OnboardingButton } from '@/components/ui/OnboardingButton';
import { Card } from '@/components/ui/Card';
import { macros as macroColors, brand } from '@/constants/Colors';
import {
  getCalculationSummary,
  type Sex,
  type ActivityLevel,
  type Goal,
} from '@/lib/macroCalculator';

type MacroInputProps = {
  label: string;
  unit: string;
  value: string;
  onChangeText: (t: string) => void;
  color: string;
};

function MacroInput({ label, unit, value, onChangeText, color }: MacroInputProps) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroInputWrap}>
        <TextInput
          style={styles.macroInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          returnKeyType="done"
        />
        <Text style={styles.macroUnit}>{unit}</Text>
      </View>
    </View>
  );
}

export default function StepMacrosScreen() {
  const insets = useSafeAreaInsets();
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
  }>();

  const goal = (params.goal || 'improve_health') as Goal;
  const sex = (params.sex || 'male') as Sex;
  const activityLevel = (params.activityLevel || 'moderately_active') as ActivityLevel;
  const heightCm = parseFloat(params.heightCm || '175');
  const weightKg = parseFloat(params.weightKg || '75');
  const dobYear = parseInt(params.dobYear || '1990', 10);
  const dobMonth = parseInt(params.dobMonth || '1', 10);
  const dobDay = parseInt(params.dobDay || '1', 10);
  const dateOfBirth = new Date(dobYear, dobMonth - 1, dobDay);

  const summary = useMemo(() => {
    return getCalculationSummary({
      weightKg,
      heightCm,
      dateOfBirth,
      sex,
      activityLevel,
      goal,
    });
  }, [weightKg, heightCm, dobYear, dobMonth, dobDay, sex, activityLevel, goal]);

  const [calories, setCalories] = useState(String(summary.targets.calories));
  const [protein, setProtein] = useState(String(summary.targets.protein));
  const [carbs, setCarbs] = useState(String(summary.targets.carbs));
  const [fat, setFat] = useState(String(summary.targets.fat));
  const [fibre, setFibre] = useState(String(summary.targets.fibre));

  const adjustmentLabel = summary.adjustment > 0
    ? `+${summary.adjustment} kcal`
    : summary.adjustment < 0
    ? `${summary.adjustment} kcal`
    : 'no adjustment';

  const proteinPerKg = weightKg > 0
    ? (parseFloat(protein) / weightKg).toFixed(1)
    : '0.0';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <StepIndicator total={5} current={3} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your daily targets</Text>
        <Text style={styles.subtitle}>
          Calculated from your body stats using the Mifflin-St Jeor equation. Adjust anything you like.
        </Text>

        {/* Calculation breakdown */}
        <Card style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>How we calculated this</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Basal Metabolic Rate (BMR)</Text>
            <Text style={styles.breakdownValue}>{summary.bmr} kcal</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Activity multiplier (TDEE)</Text>
            <Text style={styles.breakdownValue}>{summary.tdee} kcal</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Goal adjustment</Text>
            <Text style={[styles.breakdownValue, { color: summary.adjustment < 0 ? '#EF4444' : summary.adjustment > 0 ? '#10B981' : '#6B7280' }]}>
              {adjustmentLabel}
            </Text>
          </View>
        </Card>

        {/* Calories */}
        <View style={styles.calRow}>
          <Text style={styles.calLabel}>Daily Calories</Text>
          <View style={styles.calInputWrap}>
            <TextInput
              style={styles.calInput}
              value={calories}
              onChangeText={setCalories}
              keyboardType="number-pad"
              returnKeyType="done"
            />
            <Text style={styles.calUnit}>kcal</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Macros */}
        <Text style={styles.macroHeader}>Macronutrients</Text>
        <Card>
          <MacroInput label="Protein" unit="g" value={protein} onChangeText={setProtein} color={macroColors.protein} />
          <MacroInput label="Carbs" unit="g" value={carbs} onChangeText={setCarbs} color={macroColors.carbs} />
          <MacroInput label="Fat" unit="g" value={fat} onChangeText={setFat} color={macroColors.fat} />
          <MacroInput label="Fibre" unit="g" value={fibre} onChangeText={setFibre} color={macroColors.fibre} />
        </Card>

        <Text style={styles.proteinHint}>
          Protein set to {proteinPerKg}g/kg body weight
        </Text>
      </ScrollView>

      <View style={styles.bottom}>
        <OnboardingButton
          label="Next"
          onPress={() =>
            router.push({
              pathname: '/onboarding/step-taste',
              params: {
                ...params,
                calories,
                protein,
                carbs,
                fat,
                fibre,
              },
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
    lineHeight: 22,
  },
  breakdownCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  calInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  calInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    minWidth: 60,
    textAlign: 'right',
  },
  calUnit: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  macroHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  macroLabel: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  macroInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  macroInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 40,
    textAlign: 'right',
  },
  macroUnit: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  proteinHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  bottom: {
    paddingTop: 12,
  },
});
