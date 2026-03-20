import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SkeletonRecipeGrid } from '@/components/ui/Skeleton';
import { useAuth } from '@/providers/AuthProvider';
import { useTasteProfile } from '@/hooks/useTasteProfile';
import { useProfile } from '@/hooks/useProfile';
import { useAIRecipeGenerator } from '@/hooks/useAIRecipeGenerator';
import { useRecipes, RecipeSummary } from '@/hooks/useRecipes';
import { useAddToPlan } from '@/hooks/useAddToPlan';
import { seedState$, SeedState, useObservable, useAppEvent } from '@/lib/reactive';
import { brand } from '@/constants/Colors';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const EMOJI_BY_CUISINE: Record<string, string> = {
  Mediterranean: '🫒', Italian: '🍝', Mexican: '🌮', Japanese: '🍣',
  Indian: '🍛', Thai: '🥘', Chinese: '🥡', Korean: '🥢',
  British: '🍽️', American: '🍔', French: '🥐', Vietnamese: '🍜',
  Turkish: '🥙', Moroccan: '🫕', Greek: '🫒',
};

const QUICK_FILTERS = [
  { key: 'high_protein', label: 'High Protein', icon: '💪', test: (r: RecipeSummary) => (r.protein_per_serving ?? 0) >= 30 },
  { key: 'quick', label: '<30 min', icon: '⚡', test: (r: RecipeSummary) => ((r.prep_time_min ?? 0) + (r.cook_time_min ?? 0)) > 0 && ((r.prep_time_min ?? 0) + (r.cook_time_min ?? 0)) <= 30 },
  { key: 'low_cal', label: '<400 kcal', icon: '🔥', test: (r: RecipeSummary) => (r.calories_per_serving ?? 9999) < 400 },
  { key: 'ai', label: 'AI Created', icon: '🧠', test: (r: RecipeSummary) => r.is_ai_generated },
];

const MEAL_TYPE_FILTERS = [
  { key: 'breakfast', label: 'Breakfast', icon: '🥣', apiType: 'Breakfast' },
  { key: 'lunch', label: 'Lunch', icon: '🥗', apiType: 'Lunch' },
  { key: 'dinner', label: 'Dinner', icon: '🍳', apiType: 'Main Dish' },
  { key: 'afternoon_snack', label: 'Snack', icon: '🥜', apiType: 'Snack' },
];

const EXPLORE_MEAL_FILTERS = [
  { key: 'all', label: 'All', icon: '✨' },
  { key: 'breakfast', label: 'Breakfast', icon: '🥣' },
  { key: 'lunch', label: 'Lunch', icon: '🥗' },
  { key: 'dinner', label: 'Dinner', icon: '🍳' },
  { key: 'afternoon_snack', label: 'Snack', icon: '🥜' },
];

type TabKey = 'explore' | 'my_recipes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toggleInArray<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function getCardAccent(r: RecipeSummary): { label: string; color: string } | null {
  if ((r.protein_per_serving ?? 0) >= 30) return { label: 'High Protein', color: '#3B82F6' };
  const total = (r.prep_time_min ?? 0) + (r.cook_time_min ?? 0);
  if (total > 0 && total <= 15) return { label: 'Quick', color: '#F59E0B' };
  if ((r.calories_per_serving ?? 9999) < 400) return { label: 'Light', color: '#22C55E' };
  if (r.is_ai_generated) return { label: 'AI Created', color: '#7C3AED' };
  return null;
}

// ---------------------------------------------------------------------------
// Explore Recipe Card — full-width card for the Explore feed
// ---------------------------------------------------------------------------

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22C55E', medium: '#F59E0B', hard: '#EF4444', expert: '#7C3AED',
};

function ExploreRecipeCard({
  recipe,
  onAddToPlan,
}: {
  recipe: RecipeSummary;
  onAddToPlan: (recipe: RecipeSummary) => void;
}) {
  const emoji = recipe.cuisine
    ? (EMOJI_BY_CUISINE[recipe.cuisine] || '🍽️')
    : (recipe.is_ai_generated ? '🧠' : '🍽️');
  const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);
  const diff = (recipe as any).difficulty as string | undefined;
  const diffColor = DIFFICULTY_COLORS[diff ?? ''] || '#6B7280';

  return (
    <TouchableOpacity
      style={ec.card}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      activeOpacity={0.85}
    >
      {/* Emoji hero */}
      <View style={ec.heroRow}>
        <Text style={ec.heroEmoji}>{emoji}</Text>
        <View style={ec.heroMeta}>
          {diff && (
            <View style={[ec.diffBadge, { backgroundColor: diffColor + '18', borderColor: diffColor + '40' }]}>
              <Text style={[ec.diffText, { color: diffColor }]}>{diff}</Text>
            </View>
          )}
          {recipe.cuisine && (
            <Text style={ec.cuisineText}>{recipe.cuisine}</Text>
          )}
        </View>
      </View>

      <View style={ec.body}>
        <Text style={ec.title} numberOfLines={2}>{recipe.title}</Text>
        {recipe.description ? (
          <Text style={ec.description} numberOfLines={2}>{recipe.description}</Text>
        ) : null}

        {/* Macro chips */}
        <View style={ec.metaRow}>
          {recipe.calories_per_serving != null && (
            <View style={ec.metaChip}>
              <Text style={ec.metaChipText}>🔥 {Math.round(recipe.calories_per_serving)} kcal</Text>
            </View>
          )}
          {recipe.protein_per_serving != null && (
            <View style={[ec.metaChip, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[ec.metaChipText, { color: '#3B82F6' }]}>💪 {Math.round(recipe.protein_per_serving)}g</Text>
            </View>
          )}
          {totalTime > 0 && (
            <View style={[ec.metaChip, { backgroundColor: '#FFF7ED' }]}>
              <Text style={[ec.metaChipText, { color: '#F59E0B' }]}>⏱ {totalTime} min</Text>
            </View>
          )}
        </View>

        {recipe.diet_types && recipe.diet_types.length > 0 && (
          <Text style={ec.diets} numberOfLines={1}>
            {recipe.diet_types.slice(0, 3).map((d: string) => d.replace(/_/g, ' ')).join(' · ')}
          </Text>
        )}

        <View style={ec.cardActions}>
          <TouchableOpacity
            style={ec.viewBtn}
            onPress={() => router.push(`/recipe/${recipe.id}`)}
            activeOpacity={0.7}
          >
            <Text style={ec.viewBtnText}>View Recipe</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={ec.addBtn}
            onPress={(e) => { e.stopPropagation?.(); onAddToPlan(recipe); }}
            activeOpacity={0.7}
          >
            <Text style={ec.addBtnText}>+ Add to Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Local Recipe Card (existing style)
// ---------------------------------------------------------------------------

function LocalRecipeCard({
  recipe,
  onAddToPlan,
}: {
  recipe: RecipeSummary;
  onAddToPlan: (recipe: RecipeSummary) => void;
}) {
  const accent = getCardAccent(recipe);
  const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);

  return (
    <TouchableOpacity
      style={ws.card}
      activeOpacity={0.6}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
    >
      {recipe.image_url ? (
        <Image source={{ uri: recipe.image_url }} style={ws.image} />
      ) : (
        <View style={[ws.image, ws.imagePlaceholder]}>
          <Text style={ws.imagePlaceholderText}>
            {recipe.is_ai_generated ? '🧠' : (recipe.cuisine ? (EMOJI_BY_CUISINE[recipe.cuisine] || '🍽️') : '🍽️')}
          </Text>
        </View>
      )}
      <View style={ws.body}>
        {accent && (
          <View style={[ws.badge, { backgroundColor: accent.color + '15' }]}>
            <Text style={[ws.badgeText, { color: accent.color }]}>{accent.label}</Text>
          </View>
        )}
        <Text style={ws.title} numberOfLines={2}>{recipe.title}</Text>
        <View style={ws.metaRow}>
          {recipe.calories_per_serving != null && (
            <>
              <Text style={ws.meta}>{Math.round(recipe.calories_per_serving)} kcal</Text>
              <View style={ws.metaDot} />
            </>
          )}
          {recipe.protein_per_serving != null && (
            <>
              <Text style={ws.meta}>{Math.round(recipe.protein_per_serving)}g protein</Text>
              <View style={ws.metaDot} />
            </>
          )}
          {totalTime > 0 && (
            <Text style={ws.meta}>{totalTime} min</Text>
          )}
        </View>
        {recipe.diet_types && recipe.diet_types.length > 0 && (
          <Text style={ws.diets} numberOfLines={1}>
            {recipe.diet_types.slice(0, 3).map((d: string) => d.replace(/_/g, ' ')).join(' · ')}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={ws.addBtn}
        onPress={(e) => { e.stopPropagation?.(); onAddToPlan(recipe); }}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={ws.addBtnText}>+ Plan</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Filter Sheet (Modal) — for My Recipes tab
// ---------------------------------------------------------------------------

function FilterSheet({
  visible,
  onClose,
  selectedMealTypes,
  setSelectedMealTypes,
  selectedCuisines,
  setSelectedCuisines,
  activeQuickFilters,
  setActiveQuickFilters,
  cuisineList,
  favouriteCount,
  onClear,
}: {
  visible: boolean;
  onClose: () => void;
  selectedMealTypes: string[];
  setSelectedMealTypes: (v: string[]) => void;
  selectedCuisines: string[];
  setSelectedCuisines: (v: string[]) => void;
  activeQuickFilters: string[];
  setActiveQuickFilters: (v: string[]) => void;
  cuisineList: string[];
  favouriteCount: number;
  onClear: () => void;
}) {
  const insets = useSafeAreaInsets();
  const total = selectedMealTypes.length + selectedCuisines.length + activeQuickFilters.length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[fss.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={fss.header}>
          <TouchableOpacity onPress={onClear}>
            <Text style={fss.clearText}>Clear all</Text>
          </TouchableOpacity>
          <Text style={fss.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={fss.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={fss.body} showsVerticalScrollIndicator={false}>
          <Text style={fss.sectionTitle}>Meal Type</Text>
          <View style={fss.chipGrid}>
            {MEAL_TYPE_FILTERS.map((mt) => {
              const active = selectedMealTypes.includes(mt.key);
              return (
                <TouchableOpacity
                  key={mt.key}
                  style={[fss.chip, active && fss.chipActive]}
                  onPress={() => setSelectedMealTypes(toggleInArray(selectedMealTypes, mt.key))}
                  activeOpacity={0.7}
                >
                  <Text style={fss.chipIcon}>{mt.icon}</Text>
                  <Text style={[fss.chipLabel, active && fss.chipLabelActive]}>{mt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={fss.sectionTitle}>Quick Filters</Text>
          <View style={fss.chipGrid}>
            {QUICK_FILTERS.map((f) => {
              const active = activeQuickFilters.includes(f.key);
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[fss.chip, active && fss.chipActive]}
                  onPress={() => setActiveQuickFilters(toggleInArray(activeQuickFilters, f.key))}
                  activeOpacity={0.7}
                >
                  <Text style={fss.chipIcon}>{f.icon}</Text>
                  <Text style={[fss.chipLabel, active && fss.chipLabelActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={fss.sectionTitle}>Cuisine</Text>
          {favouriteCount > 0 && (
            <Text style={fss.sectionHint}>Your favourites are shown first</Text>
          )}
          <View style={fss.chipGrid}>
            {cuisineList.map((c, i) => {
              const active = selectedCuisines.includes(c);
              const isFav = i < favouriteCount;
              return (
                <TouchableOpacity
                  key={c}
                  style={[fss.chip, active && fss.chipActive, isFav && !active && fss.chipFav]}
                  onPress={() => setSelectedCuisines(toggleInArray(selectedCuisines, c))}
                  activeOpacity={0.7}
                >
                  <Text style={fss.chipIcon}>{EMOJI_BY_CUISINE[c] || '🍽️'}</Text>
                  <Text style={[fss.chipLabel, active && fss.chipLabelActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={fss.footer}>
          <TouchableOpacity style={fss.applyBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={fss.applyBtnText}>
              {total > 0 ? `Show results (${total} filter${total !== 1 ? 's' : ''})` : 'Show all recipes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// AI Generate Modal
// ---------------------------------------------------------------------------

function AIGenerateModal({
  visible,
  onClose,
  onGenerate,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onGenerate: (params: { prompt: string; cuisine: string; mealType: string }) => void;
  loading: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [mealType, setMealType] = useState('dinner');

  const CUISINE_CHIPS = ['Italian', 'Japanese', 'Indian', 'Thai', 'Mexican', 'Mediterranean', 'Korean', 'Chinese'];
  const MEAL_CHIPS = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'afternoon_snack', label: 'Snack' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[gm.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={gm.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={gm.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={gm.headerTitle}>AI Recipe</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={gm.body} keyboardShouldPersistTaps="handled">
          <View style={gm.heroRow}>
            <Text style={gm.heroEmoji}>🧠</Text>
            <Text style={gm.heroText}>
              Describe what you're craving and our AI chef will create a personalised recipe with full nutrition data.
            </Text>
          </View>

          <Text style={gm.label}>What are you in the mood for?</Text>
          <TextInput
            style={gm.input}
            placeholder="e.g. A creamy pasta with lots of veggies, high protein chicken bowl..."
            placeholderTextColor="#9CA3AF"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={gm.label}>Meal type</Text>
          <View style={gm.chipRow}>
            {MEAL_CHIPS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[gm.chip, mealType === m.key && gm.chipActive]}
                onPress={() => setMealType(m.key)}
              >
                <Text style={[gm.chipText, mealType === m.key && gm.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={gm.label}>Cuisine (optional)</Text>
          <View style={gm.chipRow}>
            {CUISINE_CHIPS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[gm.chip, cuisine === c && gm.chipActive]}
                onPress={() => setCuisine(cuisine === c ? '' : c)}
              >
                <Text style={[gm.chipText, cuisine === c && gm.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={gm.footer}>
          <TouchableOpacity
            style={[gm.generateBtn, loading && { opacity: 0.6 }]}
            onPress={() => onGenerate({ prompt, cuisine, mealType })}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={gm.generateBtnText}>🧠 Generate Recipe</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { tasteProfile } = useTasteProfile();
  const { profile } = useProfile();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('explore');

  // Unique cuisines from user's taste profile for sort-priority
  const allCuisines = Object.keys(EMOJI_BY_CUISINE);
  const cuisineList = useMemo(() => {
    const favourites = tasteProfile?.preferred_cuisines || [];
    const rest = allCuisines.filter((c) => !favourites.includes(c));
    return [...favourites, ...rest];
  }, [tasteProfile?.preferred_cuisines]);
  const favouriteCount = tasteProfile?.preferred_cuisines?.length || 0;

  // My Recipes state
  const [mySearchText, setMySearchText] = useState('');
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);

  // Explore state
  const [exploreMealFilter, setExploreMealFilter] = useState<string>('all');

  // Hooks
  const { recipes: allRecipes, isLoading: myLoading, refetch } = useRecipes({ search: mySearchText });
  const { generate: aiGenerate, loading: aiGenerating, error: aiGenError } = useAIRecipeGenerator();
  const { addToPlan } = useAddToPlan();

  // Observe background seed progress reactively (non-blocking)
  const seedState = useObservable<SeedState>(seedState$, seedState$.getValue());
  const seeding = seedState?.seeding ?? false;

  // Debounced refetch when seed batches complete in the background
  const seedRefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useAppEvent('SEED_BATCH_COMPLETE', useCallback(() => {
    if (seedRefetchTimer.current) clearTimeout(seedRefetchTimer.current);
    seedRefetchTimer.current = setTimeout(() => {
      refetch().catch(() => {});
    }, 2500);
  }, [refetch]));

  useAppEvent('SEED_COMPLETE', useCallback(() => {
    if (seedRefetchTimer.current) clearTimeout(seedRefetchTimer.current);
    setTimeout(() => refetch().catch(() => {}), 500);
  }, [refetch]));

  // Also refetch My Recipes when a recipe is imported from Edamam
  useAppEvent('RECIPE_IMPORTED', useCallback(() => {
    setTimeout(() => refetch().catch(() => {}), 300);
  }, [refetch]));

  // Explore feed — filtered by meal type
  const exploreRecipes = useMemo(() => {
    if (exploreMealFilter === 'all') return allRecipes;
    return allRecipes.filter((r) =>
      r.meal_types?.some((mt: string) => mt === exploreMealFilter)
    );
  }, [allRecipes, exploreMealFilter]);

  // Client-side filtering for My Recipes
  const filteredRecipes = useMemo(() => {
    let list = allRecipes;
    if (selectedMealTypes.length > 0) {
      list = list.filter((r) =>
        r.meal_types?.some((mt: string) => selectedMealTypes.includes(mt))
      );
    }
    if (selectedCuisines.length > 0) {
      list = list.filter((r) =>
        r.cuisine && selectedCuisines.includes(r.cuisine)
      );
    }
    for (const key of activeQuickFilters) {
      const qf = QUICK_FILTERS.find((f) => f.key === key);
      if (qf) list = list.filter(qf.test);
    }
    return list;
  }, [allRecipes, selectedMealTypes, selectedCuisines, activeQuickFilters]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleClearFilters = () => {
    setMySearchText('');
    setSelectedMealTypes([]);
    setSelectedCuisines([]);
    setActiveQuickFilters([]);
  };

  // Add local recipe to plan handler
  const handleAddToPlan = useCallback((recipe: RecipeSummary) => {
    Alert.alert(
      'Add to today\'s plan',
      `Add "${recipe.title}" as which meal?`,
      [
        { text: 'Breakfast', onPress: () => doAddLocalToPlan(recipe, 'breakfast') },
        { text: 'Lunch', onPress: () => doAddLocalToPlan(recipe, 'lunch') },
        { text: 'Dinner', onPress: () => doAddLocalToPlan(recipe, 'dinner') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, []);

  const doAddLocalToPlan = useCallback(async (recipe: RecipeSummary, mealType: string) => {
    const res = await addToPlan({
      recipeId: recipe.id,
      mealType,
      servings: 1,
      calories: recipe.calories_per_serving ?? 0,
      proteinG: recipe.protein_per_serving ?? 0,
      fatG: recipe.fat_per_serving ?? 0,
      carbsG: recipe.carbs_per_serving ?? 0,
      fibreG: recipe.fibre_per_serving ?? 0,
    });
    if (res.success) {
      Alert.alert('Added!', `"${recipe.title}" added to today's ${mealType}.`, [
        { text: 'View Plan', onPress: () => router.push('/(tabs)/plan') },
        { text: 'OK' },
      ]);
    } else {
      Alert.alert('Error', res.error || 'Could not add to plan.');
    }
  }, [addToPlan]);

  // AI generate handler
  const handleAIGenerate = useCallback(async (params: { prompt: string; cuisine: string; mealType: string }) => {
    const result = await aiGenerate(params);
    if (result) {
      setShowAIGenerate(false);
      await refetch();
      setActiveTab('my_recipes');
      Alert.alert(
        'Recipe created!',
        `"${result.recipe.title}" has been added to your recipes.`,
        [
          { text: 'View', onPress: () => router.push(`/recipe/${result.recipe_id}`) },
          { text: 'OK' },
        ],
      );
    } else if (aiGenError) {
      Alert.alert('Generation failed', aiGenError);
    }
  }, [aiGenerate, aiGenError, refetch]);

  const activeFilterCount = selectedMealTypes.length + selectedCuisines.length + activeQuickFilters.length;

  return (
    <>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Discover</Text>
          <TouchableOpacity
            style={s.aiBtn}
            onPress={() => setShowAIGenerate(true)}
            activeOpacity={0.7}
          >
            <Text style={s.aiBtnText}>🧠 AI Create</Text>
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'explore' && s.tabActive]}
            onPress={() => setActiveTab('explore')}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, activeTab === 'explore' && s.tabTextActive]}>Explore</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'my_recipes' && s.tabActive]}
            onPress={() => setActiveTab('my_recipes')}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, activeTab === 'my_recipes' && s.tabTextActive]}>
              My Recipes{allRecipes.length > 0 ? ` (${allRecipes.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ---- EXPLORE TAB ---- */}
        {activeTab === 'explore' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.tabContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={brand.primary} />}
          >
            {/* Seeding banner */}
            {seeding && (
              <View style={s.seedBanner}>
                <ActivityIndicator size="small" color="#7C3AED" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.seedTitle}>Building your recipe feed…</Text>
                  <Text style={s.seedSub}>
                    Generating {seedState?.mealType} recipes ({seedState?.completed}/{seedState?.total})
                  </Text>
                  <View style={s.seedBarTrack}>
                    <View
                      style={[
                        s.seedBarFill,
                        { width: `${(seedState?.total ?? 0) > 0 ? ((seedState?.completed ?? 0) / (seedState?.total ?? 1)) * 100 : 0}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Meal type filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.explorePillRow}>
              {EXPLORE_MEAL_FILTERS.map((mt) => (
                <TouchableOpacity
                  key={mt.key}
                  style={[s.explorePill, exploreMealFilter === mt.key && s.explorePillActive]}
                  onPress={() => setExploreMealFilter(mt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={s.explorePillIcon}>{mt.icon}</Text>
                  <Text style={[s.explorePillText, exploreMealFilter === mt.key && s.explorePillTextActive]}>
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Section header */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>
                {exploreMealFilter === 'all'
                  ? 'Discover Recipes'
                  : EXPLORE_MEAL_FILTERS.find((f) => f.key === exploreMealFilter)?.label ?? 'Recipes'}
              </Text>
              {exploreRecipes.length > 0 && (
                <Text style={s.resultCount}>{exploreRecipes.length} recipes</Text>
              )}
            </View>

            {/* Loading skeleton while initial fetch */}
            {myLoading && allRecipes.length === 0 && (
              <SkeletonRecipeGrid count={4} />
            )}

            {/* Empty state — seeding in progress */}
            {!myLoading && allRecipes.length === 0 && seeding && (
              <View style={s.emptyCard}>
                <Text style={s.emptyEmoji}>🧠</Text>
                <Text style={s.emptyTitle}>Generating your feed…</Text>
                <Text style={s.emptyText}>
                  We're creating personalised recipes for you. This only takes a moment!
                </Text>
              </View>
            )}

            {/* Empty state — nothing seeded yet */}
            {!myLoading && allRecipes.length === 0 && !seeding && (
              <View style={s.emptyCard}>
                <Text style={s.emptyEmoji}>🍽️</Text>
                <Text style={s.emptyTitle}>No recipes yet</Text>
                <Text style={s.emptyText}>
                  Create your first recipe with the AI chef button above!
                </Text>
                <TouchableOpacity
                  style={s.emptyBtnPrimary}
                  onPress={() => setShowAIGenerate(true)}
                  activeOpacity={0.7}
                >
                  <Text style={s.emptyBtnPrimaryText}>🧠 Create a Recipe</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Empty state — filter has no matches */}
            {!myLoading && allRecipes.length > 0 && exploreRecipes.length === 0 && (
              <View style={s.emptyCard}>
                <Text style={s.emptyEmoji}>🔍</Text>
                <Text style={s.emptyTitle}>No recipes here yet</Text>
                <Text style={s.emptyText}>
                  No {EXPLORE_MEAL_FILTERS.find((f) => f.key === exploreMealFilter)?.label?.toLowerCase()} recipes in your collection yet.
                </Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => setExploreMealFilter('all')}
                  activeOpacity={0.7}
                >
                  <Text style={s.emptyBtnText}>Show all recipes</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Recipe cards */}
            {exploreRecipes.map((recipe) => (
              <ExploreRecipeCard
                key={recipe.id}
                recipe={recipe}
                onAddToPlan={handleAddToPlan}
              />
            ))}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}

        {/* ---- MY RECIPES TAB ---- */}
        {activeTab === 'my_recipes' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.tabContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={brand.primary} />}
          >
            {/* Seeding banner */}
            {seeding && (
              <View style={s.seedBanner}>
                <ActivityIndicator size="small" color="#7C3AED" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.seedTitle}>Building your recipe collection...</Text>
                  <Text style={s.seedSub}>
                    Generating {seedState?.mealType} recipes ({seedState?.completed}/{seedState?.total})
                  </Text>
                  <View style={s.seedBarTrack}>
                    <View
                      style={[
                        s.seedBarFill,
                        { width: `${(seedState?.total ?? 0) > 0 ? ((seedState?.completed ?? 0) / (seedState?.total ?? 1)) * 100 : 0}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Search + Filter row */}
            <View style={s.searchRow}>
              <View style={s.searchBar}>
                <Text style={s.searchIcon}>🔍</Text>
                <TextInput
                  style={s.searchInput}
                  placeholder="Search your recipes..."
                  placeholderTextColor="#9CA3AF"
                  value={mySearchText}
                  onChangeText={setMySearchText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {mySearchText.length > 0 && (
                  <TouchableOpacity onPress={() => setMySearchText('')} style={s.clearSearch}>
                    <Text style={s.clearSearchText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
                onPress={() => setShowFilters(true)}
                activeOpacity={0.7}
              >
                <Text style={s.filterBtnIcon}>☰</Text>
                {activeFilterCount > 0 && (
                  <View style={s.filterBadge}>
                    <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Active filter pills */}
            {activeFilterCount > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.activePillRow}>
                {selectedMealTypes.map((key) => {
                  const mt = MEAL_TYPE_FILTERS.find((m) => m.key === key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={s.activePill}
                      onPress={() => setSelectedMealTypes(toggleInArray(selectedMealTypes, key))}
                    >
                      <Text style={s.activePillText}>{mt?.icon} {mt?.label || key}</Text>
                      <Text style={s.activePillX}>✕</Text>
                    </TouchableOpacity>
                  );
                })}
                {activeQuickFilters.map((key) => {
                  const f = QUICK_FILTERS.find((q) => q.key === key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={s.activePill}
                      onPress={() => setActiveQuickFilters(toggleInArray(activeQuickFilters, key))}
                    >
                      <Text style={s.activePillText}>{f?.icon} {f?.label}</Text>
                      <Text style={s.activePillX}>✕</Text>
                    </TouchableOpacity>
                  );
                })}
                {selectedCuisines.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={s.activePill}
                    onPress={() => setSelectedCuisines(toggleInArray(selectedCuisines, c))}
                  >
                    <Text style={s.activePillText}>{EMOJI_BY_CUISINE[c] || ''} {c}</Text>
                    <Text style={s.activePillX}>✕</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={s.clearAllPill} onPress={handleClearFilters}>
                  <Text style={s.clearAllPillText}>Clear all</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Section header */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>
                {mySearchText.trim().length > 0
                  ? `Results for "${mySearchText}"`
                  : activeFilterCount > 0 ? 'Filtered Recipes' : 'Your Recipes'}
              </Text>
              <Text style={s.resultCount}>
                {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
              </Text>
            </View>

            {/* Loading */}
            {myLoading && allRecipes.length === 0 && (
              <SkeletonRecipeGrid count={6} />
            )}

            {/* Empty state */}
            {!myLoading && filteredRecipes.length === 0 && (
              <View style={s.emptyCard}>
                <Text style={s.emptyEmoji}>
                  {allRecipes.length === 0 ? '📚' : '🔍'}
                </Text>
                <Text style={s.emptyTitle}>
                  {allRecipes.length === 0 ? 'No recipes yet' : 'No matches'}
                </Text>
                <Text style={s.emptyText}>
                  {allRecipes.length === 0
                    ? 'Explore recipes above to import them, or create your own with AI!'
                    : mySearchText.trim().length > 0
                      ? `No recipes match "${mySearchText}"`
                      : 'No recipes match your filters'}
                </Text>
                {allRecipes.length === 0 ? (
                  <TouchableOpacity
                    style={s.emptyBtnPrimary}
                    onPress={() => setActiveTab('explore')}
                    activeOpacity={0.7}
                  >
                    <Text style={s.emptyBtnPrimaryText}>🌍 Explore Recipes</Text>
                  </TouchableOpacity>
                ) : activeFilterCount > 0 ? (
                  <TouchableOpacity onPress={handleClearFilters} style={s.emptyBtn}>
                    <Text style={s.emptyBtnText}>Clear filters</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {/* Recipe cards */}
            {filteredRecipes.map((recipe) => (
              <LocalRecipeCard
                key={recipe.id}
                recipe={recipe}
                onAddToPlan={handleAddToPlan}
              />
            ))}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </View>

      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        selectedMealTypes={selectedMealTypes}
        setSelectedMealTypes={setSelectedMealTypes}
        selectedCuisines={selectedCuisines}
        setSelectedCuisines={setSelectedCuisines}
        activeQuickFilters={activeQuickFilters}
        setActiveQuickFilters={setActiveQuickFilters}
        cuisineList={cuisineList}
        favouriteCount={favouriteCount}
        onClear={handleClearFilters}
      />

      <AIGenerateModal
        visible={showAIGenerate}
        onClose={() => setShowAIGenerate(false)}
        onGenerate={handleAIGenerate}
        loading={aiGenerating}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  aiBtn: {
    backgroundColor: '#F5F3FF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#E9D5FF',
  },
  aiBtnText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3,
    marginBottom: 12,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#111827' },

  tabContent: { paddingHorizontal: 20, paddingBottom: 24 },

  // Search + filter row
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0 },
  clearSearch: { padding: 4 },
  clearSearchText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  filterBtn: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  filterBtnActive: { backgroundColor: brand.primaryBg, borderColor: brand.primary },
  filterBtnIcon: { fontSize: 18, color: '#374151' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9, backgroundColor: brand.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },

  // Explore meal type pills
  explorePillRow: { marginBottom: 14, flexGrow: 0 },
  explorePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', marginRight: 8,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  explorePillActive: { backgroundColor: brand.primaryBg, borderColor: brand.primary },
  explorePillIcon: { fontSize: 14 },
  explorePillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  explorePillTextActive: { color: brand.primary },

  // Active filter pills
  activePillRow: { marginBottom: 14, flexGrow: 0 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: brand.primaryBg, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8,
    borderWidth: 1, borderColor: brand.primaryBorder,
  },
  activePillText: { fontSize: 12, fontWeight: '600', color: brand.primary, textTransform: 'capitalize' },
  activePillX: { fontSize: 10, color: brand.primary, fontWeight: '700' },
  clearAllPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA',
  },
  clearAllPillText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  // Seed banner
  seedBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#E9D5FF',
  },
  seedTitle: { fontSize: 13, fontWeight: '700', color: '#5B21B6', marginBottom: 2 },
  seedSub: { fontSize: 11, color: '#7C3AED', marginBottom: 6 },
  seedBarTrack: {
    height: 4, backgroundColor: '#E9D5FF', borderRadius: 2, overflow: 'hidden',
  },
  seedBarFill: {
    height: '100%', backgroundColor: '#7C3AED', borderRadius: 2,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, marginTop: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  resultCount: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },

  // Empty / error states
  emptyCard: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  emptyBtn: { backgroundColor: brand.primaryBg, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: brand.primary },
  emptyBtnPrimary: {
    backgroundColor: brand.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  emptyBtnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ---------------------------------------------------------------------------
// AI Explore Card Styles
// ---------------------------------------------------------------------------

const ec = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  // Hero row: emoji + difficulty/cuisine
  heroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  heroEmoji: { fontSize: 44 },
  heroMeta: { flex: 1, gap: 4 },
  diffBadge: {
    alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  diffText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cuisineText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  // Card body
  body: { padding: 14 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  description: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  metaChip: {
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  metaChipText: { fontSize: 11, fontWeight: '600', color: brand.primary },
  diets: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 10, textTransform: 'capitalize' },
  cardActions: { flexDirection: 'row', gap: 8 },
  viewBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: brand.primary,
  },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: brand.primary },
  addBtn: {
    flex: 1, backgroundColor: brand.primary, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', justifyContent: 'center', minHeight: 38,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});

// ---------------------------------------------------------------------------
// Local Recipe Card Styles
// ---------------------------------------------------------------------------

const ws = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14,
    marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  image: { width: 76, height: 76, borderRadius: 10, margin: 8 },
  imagePlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { fontSize: 24 },
  body: { flex: 1, paddingVertical: 10, paddingRight: 4 },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start', marginBottom: 2 },
  badgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 11, color: '#6B7280' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB' },
  diets: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' },
  addBtn: {
    backgroundColor: brand.primaryBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 10,
    borderWidth: 1, borderColor: brand.primaryBorder,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: brand.primary },
});

// ---------------------------------------------------------------------------
// Filter Sheet Styles
// ---------------------------------------------------------------------------

const fss = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  clearText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },
  doneText: { fontSize: 15, fontWeight: '700', color: brand.primary },
  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 20,
  },
  sectionHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8, marginTop: -6 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: brand.primaryBg, borderColor: brand.primary },
  chipFav: { backgroundColor: '#FFF7ED', borderColor: '#FB923C' },
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chipLabelActive: { color: brand.primary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  applyBtn: { backgroundColor: brand.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  applyBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

// ---------------------------------------------------------------------------
// AI Generate Modal Styles
// ---------------------------------------------------------------------------

const gm = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  heroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F3FF', borderRadius: 14, padding: 16, marginBottom: 20,
  },
  heroEmoji: { fontSize: 32 },
  heroText: { flex: 1, fontSize: 14, color: '#6B7280', lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, fontSize: 15, color: '#111827', minHeight: 80,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: brand.primaryBg, borderColor: brand.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: brand.primary },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  generateBtn: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
