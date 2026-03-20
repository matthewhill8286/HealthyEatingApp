import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/providers/AuthProvider';
import { useAddToPlan } from '@/hooks/useAddToPlan';
import { brand, macros as macroColors } from '@/constants/Colors';
import type { MealSuggestion } from '@/hooks/useAICoach';

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: '#16A34A' },
  medium: { label: 'Medium', color: '#F59E0B' },
  hard: { label: 'Hard', color: '#EF4444' },
  expert: { label: 'Expert', color: '#7C3AED' },
};

function NutritionBar({
  label,
  value,
  unit,
  color,
  pct,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  pct: number;
}) {
  return (
    <View style={styles.nutriRow}>
      <Text style={styles.nutriLabel}>{label}</Text>
      <View style={styles.nutriBarTrack}>
        <View
          style={[styles.nutriBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.nutriValue, { color }]}>
        {value}
        {unit}
      </Text>
    </View>
  );
}

export default function AISuggestionScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [servings, setServings] = useState<number | null>(null);

  let suggestion: MealSuggestion | null = null;
  try {
    suggestion = data ? JSON.parse(data) : null;
  } catch {
    suggestion = null;
  }

  if (!suggestion) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.heroEmoji}>🤖</Text>
        <Text style={styles.emptyText}>Suggestion not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnPill}>
          <Text style={styles.backBtnPillText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentServings = servings ?? suggestion.servings;
  const multiplier = currentServings / suggestion.servings;
  const diff = DIFFICULTY_MAP[suggestion.difficulty] || DIFFICULTY_MAP.easy;
  const totalTime = suggestion.prep_time_min + suggestion.cook_time_min;

  const calories = suggestion.estimated_calories;
  const protein = suggestion.estimated_protein_g;
  const carbs = suggestion.estimated_carbs_g;
  const fat = suggestion.estimated_fat_g;
  const fibre = suggestion.estimated_fibre_g;

  const { addToPlan } = useAddToPlan();

  const handleAddToPlan = () => {
    if (!user) return;
    type MealType = 'breakfast' | 'lunch' | 'dinner' | 'evening_snack';
    const mealTypes: { label: string; value: MealType }[] = [
      { label: 'Breakfast', value: 'breakfast' },
      { label: 'Lunch', value: 'lunch' },
      { label: 'Dinner', value: 'dinner' },
      { label: 'Snack', value: 'evening_snack' },
    ];
    Alert.alert('Add to Meal Plan', 'Which meal?', [
      ...mealTypes.map(({ label, value: type }) => ({
        text: label,
        onPress: async () => {
          setActionLoading('plan');
          const result = await addToPlan({
            recipeId: null,
            mealType: type,
            servings: currentServings,
            calories: Math.round(calories * multiplier),
            proteinG: Math.round(protein * multiplier),
            fatG: Math.round(fat * multiplier),
            carbsG: Math.round(carbs * multiplier),
            fibreG: Math.round(fibre * multiplier),
            notes: `AI: ${suggestion!.title}`,
          });
          if (result.success) {
            Alert.alert('Added!', `${suggestion!.title} added to ${type.replace(/_/g, ' ')} for today.`);
          } else {
            Alert.alert('Error', result.error || 'Failed to add meal.');
          }
          setActionLoading(null);
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>✨ AI Suggestion</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🤖</Text>
        </View>

        <Text style={styles.title}>{suggestion.title}</Text>
        <Text style={styles.description}>{suggestion.description}</Text>

        {/* Reason tag */}
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>Why this was suggested</Text>
          <Text style={styles.reasonText}>{suggestion.reason}</Text>
        </View>

        {/* Meta chips */}
        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: diff.color + '18' }]}>
            <Text style={[styles.metaChipText, { color: diff.color }]}>{diff.label}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>⏱ {totalTime} min</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>🍽 {suggestion.cuisine}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              👤 {currentServings} serving{currentServings !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Diet type tags */}
        {suggestion.diet_types.length > 0 && (
          <View style={styles.tagRow}>
            {suggestion.diet_types.map((dt) => (
              <View key={dt} style={styles.tag}>
                <Text style={styles.tagText}>{dt}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Nutrition */}
        <Card>
          <Text style={styles.sectionTitle}>ESTIMATED NUTRITION PER SERVING</Text>
          <View style={styles.calCenter}>
            <Text style={styles.calBig}>{Math.round(calories * multiplier)}</Text>
            <Text style={styles.calUnit}>kcal</Text>
          </View>
          <NutritionBar
            label="Protein"
            value={Math.round(protein * multiplier)}
            unit="g"
            color={macroColors.protein}
            pct={calories > 0 ? ((protein * 4) / calories) * 100 : 0}
          />
          <NutritionBar
            label="Carbs"
            value={Math.round(carbs * multiplier)}
            unit="g"
            color={macroColors.carbs}
            pct={calories > 0 ? ((carbs * 4) / calories) * 100 : 0}
          />
          <NutritionBar
            label="Fat"
            value={Math.round(fat * multiplier)}
            unit="g"
            color={macroColors.fat}
            pct={calories > 0 ? ((fat * 9) / calories) * 100 : 0}
          />
          <NutritionBar
            label="Fibre"
            value={Math.round(fibre * multiplier)}
            unit="g"
            color={macroColors.fibre}
            pct={(fibre / 30) * 100}
          />
        </Card>

        {/* Servings adjuster */}
        <Card>
          <View style={styles.servingsRow}>
            <Text style={styles.sectionTitle}>SERVINGS</Text>
            <View style={styles.servingsControl}>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => setServings(Math.max(1, currentServings - 1))}
              >
                <Text style={styles.servingsBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.servingsNum}>{currentServings}</Text>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => setServings(currentServings + 1)}
              >
                <Text style={styles.servingsBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Ingredients */}
        <Card>
          <Text style={styles.sectionTitle}>INGREDIENTS</Text>
          {suggestion.ingredients.map((ing, i) => {
            const adjQty = Math.round(parseFloat(String(ing.quantity)) * multiplier * 10) / 10;
            return (
              <View key={i} style={styles.ingRow}>
                <Text style={styles.ingEmoji}>🥄</Text>
                <Text style={styles.ingName}>{ing.name}</Text>
                <Text style={styles.ingQty}>
                  {isNaN(adjQty) ? ing.quantity : adjQty} {ing.unit}
                </Text>
              </View>
            );
          })}
        </Card>

        {/* Instructions */}
        <Card>
          <Text style={styles.sectionTitle}>METHOD</Text>
          {suggestion.instructions
            .sort((a, b) => a.step - b.step)
            .map((inst) => (
              <View key={inst.step} style={styles.stepRow}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNum}>{inst.step}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>{inst.text}</Text>
                  {inst.duration_min > 0 && (
                    <Text style={styles.stepDuration}>⏱ ~{inst.duration_min} min</Text>
                  )}
                </View>
              </View>
            ))}
        </Card>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionPrimary}
            onPress={handleAddToPlan}
            activeOpacity={0.8}
            disabled={actionLoading === 'plan'}
          >
            {actionLoading === 'plan' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionPrimaryText}>Add to Plan</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#6B7280', marginTop: 12 },
  backBtnPill: {
    marginTop: 16,
    backgroundColor: brand.primaryBg,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnPillText: { fontSize: 15, fontWeight: '600', color: brand.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBtn: { padding: 8 },
  headerBtnText: { fontSize: 18, fontWeight: '600', color: brand.primary },
  aiBadge: {
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiBadgeText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  hero: {
    height: 140,
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroEmoji: { fontSize: 64 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 12 },
  reasonCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  reasonText: { fontSize: 14, color: '#78350F', lineHeight: 20, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metaChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tag: {
    backgroundColor: brand.primaryBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: brand.primary, fontWeight: '600' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  calCenter: { alignItems: 'center', marginBottom: 16 },
  calBig: { fontSize: 36, fontWeight: '800', color: '#111827' },
  calUnit: { fontSize: 14, color: '#9CA3AF' },
  nutriRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  nutriLabel: { width: 60, fontSize: 13, color: '#374151', fontWeight: '500' },
  nutriBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nutriBarFill: { height: '100%', borderRadius: 3 },
  nutriValue: { width: 50, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  servingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  servingsControl: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  servingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsBtnText: { fontSize: 20, fontWeight: '600', color: '#374151' },
  servingsNum: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  ingEmoji: { fontSize: 20 },
  ingName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  ingQty: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  stepContent: { flex: 1 },
  stepText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  stepDuration: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  actionRow: { gap: 10, marginTop: 8 },
  actionPrimary: {
    backgroundColor: brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionPrimaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
