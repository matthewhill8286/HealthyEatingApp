import React, { useState, useEffect } from 'react';
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
import { SkeletonRecipeDetail } from '@/components/ui/Skeleton';
import { useRecipeDetail } from '@/hooks/useRecipes';
import { useSmartSwap } from '@/hooks/useAICoach';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useAddToPlan } from '@/hooks/useAddToPlan';
import { brand, macros as macroColors } from '@/constants/Colors';

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: '#16A34A' },
  medium: { label: 'Medium', color: '#F59E0B' },
  hard: { label: 'Hard', color: '#EF4444' },
  expert: { label: 'Expert', color: '#7C3AED' },
};

const INGREDIENT_EMOJI: Record<string, string> = {
  'Chicken Breast (skinless)': '🍗',
  'Quinoa (cooked)': '🌾',
  'Broccoli (raw)': '🥦',
  'Bell Pepper (red)': '🫑',
  Avocado: '🥑',
  'Olive Oil (extra virgin)': '🫒',
  'Spinach (raw)': '🥬',
  'Oats (rolled, dry)': '🥣',
  'Almond Milk (unsweetened)': '🥛',
  'Chia Seeds': '🌱',
  Blueberries: '🫐',
  'Almond Butter': '🥜',
  'Salmon (Atlantic, raw)': '🐟',
  'Brown Rice (cooked)': '🍚',
  'Lentils (cooked)': '🫘',
  'Tomatoes (raw)': '🍅',
  'Coconut Oil': '🥥',
  'Prawns (raw)': '🦐',
  'Mushrooms (white, raw)': '🍄',
  'Greek Yoghurt (plain, 0% fat)': '🥛',
  Banana: '🍌',
  Walnuts: '🌰',
  'Flaxseeds (ground)': '🌱',
  'Sweet Potato (raw)': '🍠',
  'Black Beans (cooked)': '🫘',
  'Pasta (wholemeal, cooked)': '🍝',
  'Tofu (firm)': '🧈',
  'Kale (raw)': '🥬',
  'Chickpeas (cooked)': '🫘',
  'Eggs (whole, raw)': '🥚',
  'Wholemeal Bread': '🍞',
  'Ground Beef (90% lean)': '🥩',
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

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { recipe, isLoading } = useRecipeDetail(id);

  const [isFavourite, setIsFavourite] = useState(false);
  const [servings, setServings] = useState(2);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { swaps, coachMessage: swapMessage, isLoading: swapLoading, fetchSwaps } = useSmartSwap();
  const [showSwaps, setShowSwaps] = useState(false);

  // Set servings from recipe data when loaded
  useEffect(() => {
    if (recipe) setServings(recipe.servings);
  }, [recipe?.id]);

  // Check if recipe is favourited
  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('favourite_recipes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsFavourite(true);
      });
  }, [user?.id, id]);

  const multiplier = recipe ? servings / recipe.servings : 1;
  const diff = DIFFICULTY_MAP[recipe?.difficulty || 'easy'] || DIFFICULTY_MAP.easy;

  const calories = recipe?.calories_per_serving || 0;
  const protein = recipe?.protein_per_serving || 0;
  const carbs = recipe?.carbs_per_serving || 0;
  const fat = recipe?.fat_per_serving || 0;
  const fibre = recipe?.fibre_per_serving || 0;
  const sugar = recipe?.sugar_per_serving || 0;
  const sodium = recipe?.sodium_per_serving || 0;

  // Parse instructions from jsonb — handles both string[] and {step, text}[] formats
  const instructions: string[] = (() => {
    const raw = recipe?.instructions;
    if (!raw) return [];
    // If it's a JSON string, parse it first
    let parsed = raw;
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch { return []; }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && item.text) return item.text;
      if (item && typeof item === 'object' && item.step) return String(item.step);
      return String(item);
    });
  })();

  const handleSmartSwap = (reason: string) => {
    setShowSwaps(true);
    fetchSwaps(id || '', reason);
  };

  const handleToggleFavourite = async () => {
    if (!user || !id) return;
    const newState = !isFavourite;
    setIsFavourite(newState);

    if (newState) {
      await supabase.from('favourite_recipes').insert({ user_id: user.id, recipe_id: id });
    } else {
      await supabase.from('favourite_recipes').delete().eq('user_id', user.id).eq('recipe_id', id);
    }
  };

  const { addToPlan } = useAddToPlan();

  const addToPlanWithType = async (mealType: string) => {
    if (!user || !id) return;
    setActionLoading('plan');

    const result = await addToPlan({
      recipeId: id,
      mealType,
      servings,
      calories: Math.round(calories * multiplier),
      proteinG: Math.round(protein * multiplier),
      fatG: Math.round(fat * multiplier),
      carbsG: Math.round(carbs * multiplier),
      fibreG: Math.round(fibre * multiplier),
    });

    if (result.success) {
      Alert.alert('Added!', `${recipe?.title} added as ${mealType.replace(/_/g, ' ')} for today.`);
    } else {
      Alert.alert('Error', result.error || 'Failed to add to plan.');
    }
    setActionLoading(null);
  };

  const handleAddToPlan = () => {
    if (!user || !id || !recipe) return;

    const recipeMealTypes = recipe.meal_types || [];

    // If recipe has exactly one meal type, add directly — no picker needed
    if (recipeMealTypes.length === 1) {
      addToPlanWithType(recipeMealTypes[0]);
      return;
    }

    // Build options from the recipe's meal_types, or show all if untagged
    type MealOption = { label: string; value: string };
    const allOptions: MealOption[] = [
      { label: '🥣 Breakfast', value: 'breakfast' },
      { label: '🥗 Lunch', value: 'lunch' },
      { label: '🍳 Dinner', value: 'dinner' },
      { label: '🥜 Snack', value: 'evening_snack' },
    ];

    const options =
      recipeMealTypes.length > 0
        ? allOptions.filter(
            (o) =>
              recipeMealTypes.includes(o.value) ||
              recipeMealTypes.some((mt) => mt.includes('snack') && o.value === 'evening_snack'),
          )
        : allOptions;

    Alert.alert(
      'Add to Meal Plan',
      `This works as ${recipeMealTypes.length > 0 ? recipeMealTypes.map((t) => t.replace(/_/g, ' ')).join(', ') : 'any meal'}. Which slot?`,
      [
        ...options.map(({ label, value }) => ({
          text: label,
          onPress: () => addToPlanWithType(value),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleLogCooked = async () => {
    if (!user || !id) return;
    setActionLoading('cook');
    await supabase.from('cooking_log').insert({
      user_id: user.id,
      recipe_id: id,
      servings_made: servings,
      notes: '',
    });
    setActionLoading(null);
    Alert.alert('Logged!', `${recipe?.title} has been logged to your cooking history.`);
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SkeletonRecipeDetail />
        </ScrollView>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={[styles.screen, styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.heroEmoji}>🍽️</Text>
        <Text style={styles.loadingText}>Recipe not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleFavourite} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>{isFavourite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🥗</Text>
        </View>

        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.description}>{recipe.description}</Text>

        {/* Meal type badges */}
        {recipe.meal_types && recipe.meal_types.length > 0 && (
          <View style={styles.mealTypeRow}>
            {recipe.meal_types.map((mt) => (
              <View key={mt} style={styles.mealTypeBadge}>
                <Text style={styles.mealTypeBadgeText}>{mt.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Meta chips */}
        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: diff.color + '18' }]}>
            <Text style={[styles.metaChipText, { color: diff.color }]}>{diff.label}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              ⏱ {(recipe.prep_time_min || 0) + (recipe.cook_time_min || 0)} min
            </Text>
          </View>
          {recipe.cuisine && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🍽 {recipe.cuisine}</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <View style={styles.tagRow}>
            {recipe.tags.map((t) => (
              <View key={t.tag.id} style={styles.tag}>
                <Text style={styles.tagText}>{t.tag.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Nutrition */}
        <Card>
          <Text style={styles.sectionTitle}>NUTRITION PER SERVING</Text>
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
          {sugar > 0 && (
            <NutritionBar
              label="Sugar"
              value={Math.round(sugar * multiplier)}
              unit="g"
              color="#F472B6"
              pct={(sugar / 50) * 100}
            />
          )}
          {sodium > 0 && (
            <NutritionBar
              label="Sodium"
              value={Math.round(sodium * multiplier)}
              unit="mg"
              color="#A78BFA"
              pct={(sodium / 2300) * 100}
            />
          )}
        </Card>

        {/* Servings adjuster */}
        <Card>
          <View style={styles.servingsRow}>
            <Text style={styles.sectionTitle}>SERVINGS</Text>
            <View style={styles.servingsControl}>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => setServings(Math.max(1, servings - 1))}
              >
                <Text style={styles.servingsBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.servingsNum}>{servings}</Text>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => setServings(servings + 1)}
              >
                <Text style={styles.servingsBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Ingredients */}
        <Card>
          <Text style={styles.sectionTitle}>INGREDIENTS</Text>
          {recipe.ingredients
            .sort((a, b) => a.display_order - b.display_order)
            .map((ing, i) => {
              const emoji = INGREDIENT_EMOJI[ing.ingredient.name] || '🥄';
              const adjQty = Math.round(ing.quantity * multiplier * 10) / 10;
              return (
                <View key={ing.id || i} style={styles.ingRow}>
                  <Text style={styles.ingEmoji}>{emoji}</Text>
                  <View style={styles.ingInfo}>
                    <Text style={styles.ingName}>{ing.ingredient.name}</Text>
                    {ing.preparation_note ? (
                      <Text style={styles.ingPrep}>{ing.preparation_note}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.ingQty}>
                    {adjQty}
                    {ing.unit}
                  </Text>
                </View>
              );
            })}
        </Card>

        {/* Smart Swap */}
        <Card>
          <Text style={styles.sectionTitle}>✨ SMART SWAP</Text>
          <Text style={styles.swapHint}>Let AI suggest healthier ingredient alternatives</Text>
          <View style={styles.swapBtnRow}>
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={() => handleSmartSwap('make it healthier')}
              activeOpacity={0.7}
              disabled={swapLoading}
            >
              <Text style={styles.swapBtnText}>🥗 Healthier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={() => handleSmartSwap('more protein')}
              activeOpacity={0.7}
              disabled={swapLoading}
            >
              <Text style={styles.swapBtnText}>💪 More Protein</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={() => handleSmartSwap('lower calorie')}
              activeOpacity={0.7}
              disabled={swapLoading}
            >
              <Text style={styles.swapBtnText}>🔥 Lower Cal</Text>
            </TouchableOpacity>
          </View>

          {swapLoading && (
            <View style={styles.swapLoading}>
              <ActivityIndicator size="small" color={brand.primary} />
              <Text style={styles.swapLoadingText}>Thinking of swaps...</Text>
            </View>
          )}

          {showSwaps && swapMessage && !swapLoading && (
            <Text style={styles.swapCoachMsg}>{swapMessage}</Text>
          )}

          {showSwaps &&
            swaps.length > 0 &&
            !swapLoading &&
            swaps.map((swap, i) => (
              <View key={i} style={styles.swapCard}>
                <View style={styles.swapHeader}>
                  <Text style={styles.swapOriginal}>{swap.original}</Text>
                  <Text style={styles.swapArrow}>→</Text>
                  <Text style={styles.swapReplacement}>{swap.replacement}</Text>
                </View>
                <Text style={styles.swapReason}>{swap.reason}</Text>
                <Text style={styles.swapImpact}>{swap.macro_impact}</Text>
              </View>
            ))}
        </Card>

        {/* Instructions */}
        <Card>
          <Text style={styles.sectionTitle}>METHOD</Text>
          {instructions.map((text, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>{text}</Text>
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
          <TouchableOpacity
            style={styles.actionSecondary}
            onPress={handleLogCooked}
            activeOpacity={0.7}
            disabled={actionLoading === 'cook'}
          >
            {actionLoading === 'cook' ? (
              <ActivityIndicator size="small" color="#374151" />
            ) : (
              <Text style={styles.actionSecondaryText}>Log as Cooked</Text>
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
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15, color: '#6B7280', marginTop: 12 },
  backBtn: {
    marginTop: 16,
    backgroundColor: brand.primaryBg,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: brand.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBtn: { padding: 8 },
  headerBtnText: { fontSize: 18, fontWeight: '600', color: brand.primary },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  hero: {
    height: 160,
    backgroundColor: '#F0FDF4',
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
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  mealTypeBadge: {
    backgroundColor: brand.primaryBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
  },
  mealTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: brand.primary,
    textTransform: 'capitalize',
  },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
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
  ingInfo: { flex: 1 },
  ingName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  ingPrep: { fontSize: 12, color: '#9CA3AF' },
  ingQty: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brand.primaryBg,
    borderWidth: 1.5,
    borderColor: brand.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNum: { fontSize: 13, fontWeight: '700', color: brand.primary },
  stepContent: { flex: 1 },
  stepText: { fontSize: 15, color: '#374151', lineHeight: 22 },
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
  actionSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  actionSecondaryText: { color: '#374151', fontSize: 17, fontWeight: '600' },
  swapHint: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  swapBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  swapBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  swapBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  swapLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  swapLoadingText: { fontSize: 13, color: '#6B7280' },
  swapCoachMsg: {
    fontSize: 13,
    color: brand.primary,
    fontWeight: '600',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  swapCard: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 8 },
  swapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  swapOriginal: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  swapArrow: { fontSize: 16, color: '#9CA3AF' },
  swapReplacement: { fontSize: 14, color: '#16A34A', fontWeight: '700' },
  swapReason: { fontSize: 12, color: '#374151', marginBottom: 2 },
  swapImpact: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
});
