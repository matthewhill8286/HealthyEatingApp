import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Vibration,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn as ReanimatedFadeIn, Layout } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { CoachBubble } from '@/components/ui/CoachBubble';
import { FadeIn } from '@/components/ui/FadeIn';
import {
  SkeletonDaySelector,
  SkeletonMacroBar,
  SkeletonMealList,
} from '@/components/ui/Skeleton';
import { useProfile } from '@/hooks/useProfile';
import { useActiveMealPlan } from '@/hooks/useMealPlan';
import { useMealSuggestions, MealSuggestion } from '@/hooks/useAICoach';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/hooks/useTheme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🥣', morning_snack: '🍎', lunch: '🥗',
  afternoon_snack: '🥜', dinner: '🍳', evening_snack: '🍫',
};

const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  morning_snack: 'Morning Snack',
  lunch: 'Lunch',
  afternoon_snack: 'Afternoon Snack',
  dinner: 'Dinner',
  evening_snack: 'Evening Snack',
};

function getWeekDates(weekOffset: number = 0): { name: string; num: number; dateStr: string; monthShort: string; year: number }[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);

  return DAYS.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      name,
      num: d.getDate(),
      dateStr: d.toISOString().split('T')[0],
      monthShort: d.toLocaleDateString('en-GB', { month: 'short' }),
      year: d.getFullYear(),
    };
  });
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { plan, entries, getEntriesForDate, calcDayMacros, removeEntry, isLoading, refetch } = useActiveMealPlan();
  const { isGenerating: listLoading, generateFromPlan } = useShoppingList();
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const weekDates = getWeekDates(weekOffset);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayIdx = weekDates.findIndex((d) => d.dateStr === todayStr);
  const [selectedDay, setSelectedDay] = useState(() => {
    const idx = getWeekDates(0).findIndex((d) => d.dateStr === todayStr);
    return idx >= 0 ? idx : 0;
  });

  const { suggestions, coachMessage: aiMessage, isLoading: aiLoading, fetchSuggestions } = useMealSuggestions();
  const [showAISuggestions, setShowAISuggestions] = useState(false);

  const selectedDate = weekDates[selectedDay]?.dateStr || '';
  const dayEntries = getEntriesForDate(selectedDate);
  const dayMacros = calcDayMacros(dayEntries);

  const targets = {
    calories: profile?.daily_calorie_target || 2100,
    protein: profile?.daily_protein_g || 150,
    carbs: profile?.daily_carbs_g || 200,
    fat: profile?.daily_fat_g || 70,
  };

  const plannedMealTypes = dayEntries.map((e) => e.meal_type);
  const coreMeals = ['breakfast', 'lunch', 'dinner'];
  const missingMeals = coreMeals.filter((m) => !plannedMealTypes.includes(m));

  // Week navigation
  const goToPrevWeek = () => {
    Vibration.vibrate(10);
    setWeekOffset((w) => w - 1);
    setSelectedDay(0);
    setShowAISuggestions(false);
  };
  const goToNextWeek = () => {
    Vibration.vibrate(10);
    setWeekOffset((w) => w + 1);
    setSelectedDay(0);
    setShowAISuggestions(false);
  };
  const goToThisWeek = () => {
    Vibration.vibrate(10);
    setWeekOffset(0);
    const idx = getWeekDates(0).findIndex((d) => d.dateStr === todayStr);
    setSelectedDay(idx >= 0 ? idx : 0);
    setShowAISuggestions(false);
  };

  const handleSelectDay = (i: number) => {
    Vibration.vibrate(10);
    setSelectedDay(i);
    setShowAISuggestions(false);
  };

  // Copy meals from previous day
  const handleCopyPreviousDay = () => {
    const prevDayIdx = selectedDay > 0 ? selectedDay - 1 : 6;
    const prevWeek = selectedDay > 0 ? weekOffset : weekOffset - 1;
    const prevDates = getWeekDates(prevWeek);
    const prevDate = prevDates[prevDayIdx]?.dateStr;
    const prevEntries = getEntriesForDate(prevDate);

    if (prevEntries.length === 0) {
      Alert.alert('No meals to copy', `${DAYS[prevDayIdx]} has no planned meals.`);
      return;
    }

    Alert.alert(
      'Copy meals?',
      `Copy ${prevEntries.length} meal${prevEntries.length > 1 ? 's' : ''} from ${DAYS[prevDayIdx]} to ${weekDates[selectedDay].name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => {
            // TODO: implement copy via addToPlan hook for each entry
            Alert.alert('Coming soon', 'Meal copying will be available in the next update.');
          },
        },
      ]
    );
  };

  const handleGenerateList = async () => {
    Vibration.vibrate(10);
    const result = await generateFromPlan();
    if (result.success) {
      Alert.alert('Shopping list generated!', 'Built from all the recipes in your meal plan.', [
        { text: 'View List', onPress: () => router.push('/(tabs)/shop') },
        { text: 'OK' },
      ]);
    } else {
      Alert.alert('Could not generate list', result.error || 'Something went wrong.');
    }
  };

  const handleAIFillGaps = () => {
    Vibration.vibrate(10);
    if (missingMeals.length === 0) {
      Alert.alert('All planned!', 'This day already has breakfast, lunch, and dinner covered.');
      return;
    }
    setShowAISuggestions(true);
    fetchSuggestions(missingMeals[0], selectedDate);
  };

  const macroPct = (val: number, target: number) => target > 0 ? Math.min((val / target) * 100, 100) : 0;

  const weekLabel = `${weekDates[0].num}–${weekDates[6].num} ${weekDates[0].monthShort}${weekDates[0].year !== weekDates[6].year ? ` ${weekDates[0].year}` : ''}`;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.screenBg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      {/* Header with week navigation */}
      <FadeIn delay={0}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Meal Plan</Text>
            <View style={styles.weekNav}>
              <TouchableOpacity onPress={goToPrevWeek} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.weekArrow, { color: colors.textSecondary }]}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToThisWeek}>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{weekLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToNextWeek} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.weekArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
              {weekOffset !== 0 && (
                <TouchableOpacity
                  style={[styles.todayChip, { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder }]}
                  onPress={goToThisWeek}
                >
                  <Text style={[styles.todayChipText, { color: colors.primary }]}>Today</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </FadeIn>

      {isLoading ? (
        <>
          <SkeletonDaySelector />
          <SkeletonMacroBar />
          <SkeletonMealList count={3} />
        </>
      ) : (
      <>
      {/* Day selector — pill style */}
      <FadeIn delay={50}>
        <View style={styles.dayRow}>
          {weekDates.map((day, i) => {
            const isSelected = i === selectedDay;
            const isToday = day.dateStr === todayStr;
            const dayHasMeals = getEntriesForDate(day.dateStr).length > 0;
            return (
              <TouchableOpacity
                key={day.dateStr}
                style={[
                  styles.dayPill,
                  { backgroundColor: colors.pillBg, borderColor: colors.pillBorder },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  isToday && !isSelected && { borderColor: colors.pillTodayBorder, backgroundColor: colors.pillTodayBg },
                ]}
                onPress={() => handleSelectDay(i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayName, { color: colors.textTertiary }, isSelected && styles.dayTextActive]}>
                  {day.name}
                </Text>
                <Text style={[styles.dayNum, { color: colors.textPrimary }, isSelected && styles.dayTextActive]}>
                  {day.num}
                </Text>
                {dayHasMeals && !isSelected && (
                  <View style={[styles.dayDot, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </FadeIn>

      {/* Macro summary — horizontal progress bars */}
      <FadeIn delay={100}>
        <Card style={[styles.macroCard, { backgroundColor: colors.cardBg }]}>
          <View style={styles.macroGrid}>
            {[
              { label: 'Calories', val: Math.round(dayMacros.calories), target: targets.calories, color: colors.textPrimary, unit: 'kcal' },
              { label: 'Protein', val: Math.round(dayMacros.protein), target: targets.protein, color: colors.macroProtein, unit: 'g' },
              { label: 'Carbs', val: Math.round(dayMacros.carbs), target: targets.carbs, color: colors.macroCarbs, unit: 'g' },
              { label: 'Fat', val: Math.round(dayMacros.fat), target: targets.fat, color: colors.macroFat, unit: 'g' },
            ].map((m) => (
              <View key={m.label} style={styles.macroItem}>
                <View style={styles.macroItemHeader}>
                  <Text style={[styles.macroItemLabel, { color: colors.textSecondary }]}>{m.label}</Text>
                  <Text style={[styles.macroItemVal, { color: m.color }]}>
                    {m.val.toLocaleString()}{m.unit === 'kcal' ? '' : m.unit}
                    <Text style={[styles.macroItemTarget, { color: colors.textTertiary }]}> / {m.target}{m.unit === 'kcal' ? '' : m.unit}</Text>
                  </Text>
                </View>
                <View style={[styles.macroBarTrack, { backgroundColor: colors.trackBg }]}>
                  <Animated.View
                    style={[
                      styles.macroBarFill,
                      { width: `${macroPct(m.val, m.target)}%`, backgroundColor: m.color },
                    ]}
                    entering={FadeInDown.delay(200).duration(300)}
                    layout={Layout.springify().damping(18)}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>
      </FadeIn>

      {/* Meals section header + copy button */}
      <FadeIn delay={150}>
        <View style={styles.mealsSectionHeader}>
          <Text style={[styles.mealsSectionTitle, { color: colors.textPrimary }]}>
            {weekDates[selectedDay].name}'s Meals
          </Text>
          <View style={styles.mealsSectionRight}>
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: colors.primaryBg }]}
              onPress={handleCopyPreviousDay}
              activeOpacity={0.7}
            >
              <Text style={[styles.copyBtnText, { color: colors.primary }]}>📋 Copy prev</Text>
            </TouchableOpacity>
            <Text style={[styles.mealsSectionCount, { color: colors.textTertiary }]}>
              {dayEntries.length} {dayEntries.length === 1 ? 'meal' : 'meals'}
            </Text>
          </View>
        </View>
      </FadeIn>

      {dayEntries.length > 0 ? (
        dayEntries.map((entry, idx) => {
          const isAI = !entry.recipe && entry.notes?.startsWith('AI: ');
          const displayName =
            entry.recipe?.title ||
            (isAI ? entry.notes!.slice(4) : null) ||
            'Untitled';

          const handleEntryPress = () => {
            Vibration.vibrate(10);
            if (entry.recipe) {
              router.push(`/recipe/${entry.recipe.id}`);
            } else if (isAI) {
              router.push({
                pathname: '/ai-meal-detail',
                params: {
                  title: displayName,
                  mealType: entry.meal_type,
                  calories: String(entry.calories || 0),
                  proteinG: String(entry.protein_g || 0),
                  fatG: String(entry.fat_g || 0),
                  carbsG: String(entry.carbs_g || 0),
                  fibreG: String(entry.fibre_g || 0),
                  servings: String(entry.servings || 1),
                  notes: entry.notes || '',
                  planDate: entry.plan_date || '',
                },
              });
            }
          };

          const handleRemove = async () => {
            Vibration.vibrate(10);
            const ok = await removeEntry(entry.id);
            if (!ok) {
              Alert.alert('Error', 'Could not remove this meal. Please try again.');
            }
          };

          const totalCal = Math.round(
            (entry.calories || entry.recipe?.calories_per_serving || 0) * (entry.servings || 1)
          );

          return (
            <Animated.View
              key={entry.id}
              entering={FadeInDown.delay(200 + idx * 60).duration(300).springify().damping(18)}
              layout={Layout.springify().damping(18)}
            >
              <SwipeableRow onDelete={handleRemove}>
                <TouchableOpacity
                  style={[styles.mealCard, styles.mealCardNoMargin, { backgroundColor: colors.cardBg }]}
                  activeOpacity={0.6}
                  onPress={handleEntryPress}
                >
                  <View style={[styles.mealAccent, { backgroundColor: colors.primary }, isAI && { backgroundColor: colors.aiAccent }]} />
                  <View style={styles.mealCardBody}>
                    <View style={[styles.mealThumb, { backgroundColor: colors.trackBg }, isAI && { backgroundColor: colors.aiBg }]}>
                      <Text style={styles.mealEmoji}>
                        {isAI ? '🤖' : MEAL_EMOJI[entry.meal_type] || '🍽️'}
                      </Text>
                    </View>
                    <View style={styles.mealInfo}>
                      <Text style={[styles.mealType, { color: colors.textTertiary }]}>
                        {MEAL_LABEL[entry.meal_type] || entry.meal_type.replace(/_/g, ' ')}
                        {isAI ? ' · AI' : ''}
                      </Text>
                      <Text style={[styles.mealName, { color: colors.textPrimary }]} numberOfLines={1}>{displayName}</Text>
                    </View>
                    <View style={styles.mealCalBadge}>
                      <Text style={[styles.mealCalText, { color: colors.textLabel }]}>{totalCal}</Text>
                      <Text style={[styles.mealCalUnit, { color: colors.textTertiary }]}>kcal</Text>
                    </View>
                    <Text style={[styles.mealArrow, { color: colors.border }]}>›</Text>
                  </View>
                </TouchableOpacity>
              </SwipeableRow>
            </Animated.View>
          );
        })
      ) : (
        <FadeIn delay={200}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No meals planned</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              Browse recipes in Discover to add meals to {weekDates[selectedDay].name}.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primaryBg }]}
              onPress={() => router.push('/(tabs)/discover')}
            >
              <Text style={[styles.emptyBtnText, { color: colors.primary }]}>Browse recipes</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>
      )}

      {/* Action buttons */}
      <FadeIn delay={300}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.cardBg }]}
            activeOpacity={0.7}
            onPress={handleGenerateList}
            disabled={listLoading}
          >
            {listLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={styles.actionEmoji}>🛒</Text>
                <Text style={[styles.actionLabel, { color: colors.textLabel }]}>Build List</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.cardBg }]}
            activeOpacity={0.7}
            onPress={handleAIFillGaps}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={styles.actionEmoji}>🧠</Text>
                <Text style={[styles.actionLabel, { color: colors.textLabel }]}>
                  AI Fill{missingMeals.length > 0 ? ` (${missingMeals.length})` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.cardBg }]}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/discover')}
          >
            <Text style={styles.actionEmoji}>✨</Text>
            <Text style={[styles.actionLabel, { color: colors.textLabel }]}>Discover</Text>
          </TouchableOpacity>
        </View>
      </FadeIn>

      {/* AI Suggestions */}
      {showAISuggestions && aiMessage && !aiLoading && (
        <FadeIn delay={0}>
          <CoachBubble message={aiMessage} />
        </FadeIn>
      )}

      {showAISuggestions && suggestions.length > 0 && !aiLoading && (
        <FadeIn delay={100}>
          <View style={styles.aiSection}>
            <Text style={[styles.aiTitle, { color: colors.textPrimary }]}>AI Suggestions for {MEAL_LABEL[missingMeals[0]] || missingMeals[0]}</Text>
            {suggestions.map((s, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.delay(i * 80).duration(300).springify().damping(18)}
              >
                <TouchableOpacity
                  style={[styles.aiCard, { backgroundColor: colors.successBg }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Vibration.vibrate(10);
                    router.push({ pathname: '/ai-suggestion', params: { data: JSON.stringify(s) } });
                  }}
                >
                  <View style={styles.aiCardHeader}>
                    <Text style={[styles.aiCardTitle, { color: colors.textPrimary }]}>{s.title}</Text>
                    <Text style={[styles.aiCardMeta, { color: colors.textSecondary }]}>
                      {s.estimated_calories} kcal · {s.estimated_protein_g}g protein
                    </Text>
                  </View>
                  <Text style={[styles.aiCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{s.description}</Text>
                  <View style={styles.aiCardFooter}>
                    <Text style={[styles.aiCardReason, { color: colors.primary }]}>{s.reason}</Text>
                    <Text style={[styles.aiCardChevron, { color: colors.border }]}>›</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </FadeIn>
      )}

      <View style={{ height: 32 }} />
      </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weekArrow: { fontSize: 24, fontWeight: '300', paddingHorizontal: 4 },
  subtitle: { fontSize: 14, fontWeight: '500' },
  todayChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 4,
  },
  todayChipText: { fontSize: 11, fontWeight: '700' },

  // Day selector
  dayRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  dayName: { fontSize: 10, fontWeight: '500', letterSpacing: 0.3 },
  dayNum: { fontSize: 16, fontWeight: '700', marginTop: 1 },
  dayTextActive: { color: '#FFFFFF' },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },

  // Macro card
  macroCard: { paddingVertical: 14 },
  macroGrid: { gap: 10 },
  macroItem: {},
  macroItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  macroItemLabel: { fontSize: 12, fontWeight: '500' },
  macroItemVal: { fontSize: 13, fontWeight: '700' },
  macroItemTarget: { fontSize: 11, fontWeight: '500' },
  macroBarTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Meals section
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  mealsSectionTitle: { fontSize: 16, fontWeight: '700' },
  mealsSectionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealsSectionCount: { fontSize: 12 },
  copyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  copyBtnText: { fontSize: 11, fontWeight: '600' },

  // Meal card
  mealCard: {
    borderRadius: 14,
    marginBottom: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  mealCardNoMargin: { marginBottom: 0, borderRadius: 0 },
  mealAccent: { width: 4 },
  mealCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  mealThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealEmoji: { fontSize: 19 },
  mealInfo: { flex: 1 },
  mealType: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  mealName: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  mealCalBadge: { alignItems: 'center' },
  mealCalText: { fontSize: 14, fontWeight: '700' },
  mealCalUnit: { fontSize: 9 },
  mealArrow: { fontSize: 20, fontWeight: '300' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
  emptyBtn: {
    borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600' },

  // Action row
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 60,
  },
  actionEmoji: { fontSize: 20, marginBottom: 3 },
  actionLabel: { fontSize: 12, fontWeight: '600' },

  // AI section
  aiSection: { marginTop: 12 },
  aiTitle: {
    fontSize: 15, fontWeight: '700', marginBottom: 10,
  },
  aiCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiCardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  aiCardMeta: { fontSize: 11, fontWeight: '500' },
  aiCardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  aiCardReason: { fontSize: 11, fontWeight: '600', fontStyle: 'italic', flex: 1 },
  aiCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiCardChevron: { fontSize: 22, fontWeight: '300', marginLeft: 8 },
});
