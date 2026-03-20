import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Vibration,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { CoachBubble } from '@/components/ui/CoachBubble';
import { AnimatedMacroRing } from '@/components/ui/AnimatedMacroRing';
import { FadeIn } from '@/components/ui/FadeIn';
import {
  SkeletonMacroRings,
  SkeletonWeekChart,
  SkeletonMealList,
  SkeletonCoachBubble,
} from '@/components/ui/Skeleton';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useActiveMealPlan } from '@/hooks/useMealPlan';
import { useDailyTip } from '@/hooks/useAICoach';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🥣',
  morning_snack: '🍎',
  lunch: '🥗',
  afternoon_snack: '🥜',
  dinner: '🍳',
  evening_snack: '🍫',
};

const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  morning_snack: 'Morning Snack',
  lunch: 'Lunch',
  afternoon_snack: 'Afternoon Snack',
  dinner: 'Dinner',
  evening_snack: 'Evening Snack',
};

const MEAL_ORDER = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'evening_snack',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const {
    todayEntries,
    entries: allEntries,
    calcDayMacros,
    getEntriesForDate,
    removeEntry,
    isLoading,
    refetch,
  } = useActiveMealPlan();
  const [refreshing, setRefreshing] = useState(false);

  const { tip, isLoading: tipLoading, fetchTip } = useDailyTip();

  useEffect(() => {
    if (user) fetchTip();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'there';

  const dayMacros =
    todayEntries.length > 0
      ? calcDayMacros(todayEntries)
      : { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };

  const targets = {
    calories: profile?.daily_calorie_target || 2100,
    protein: profile?.daily_protein_g || 150,
    carbs: profile?.daily_carbs_g || 200,
    fat: profile?.daily_fat_g || 70,
    fibre: profile?.daily_fibre_g || 30,
  };

  const sortedEntries = [...todayEntries].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type),
  );

  const fallbackMessage =
    dayMacros.protein > targets.protein * 0.8
      ? "You're crushing your protein goal today! Keep it up"
      : dayMacros.fibre < targets.fibre * 0.3
        ? "Try adding some lentils or broccoli today — they're great for hitting your fibre target."
        : todayEntries.length === 0
          ? 'No meals planned yet. Head to the Plan tab to set up your week, or Discover to find inspiration!'
          : "You're on track today. Keep making great choices!";

  const coachMessage = tip || fallbackMessage;

  const calPct = targets.calories > 0
    ? Math.min(Math.round((dayMacros.calories / targets.calories) * 100), 100)
    : 0;

  const handleRemoveMeal = (entryId: string, recipeName: string) => {
    Vibration.vibrate(10);
    Alert.alert('Remove meal', `Remove "${recipeName}" from today's plan?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeEntry(entryId),
      },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    if (user) fetchTip();
    setRefreshing(false);
  };

  // Weekly chart data — last 7 days
  const weekData = useMemo(() => {
    const days: { label: string; fullLabel: string; calories: number; target: number; pct: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'narrow' });
      const fullLabel = d.toLocaleDateString('en-GB', { weekday: 'short' });
      const dayEntries = getEntriesForDate(dateStr);
      const macros = calcDayMacros(dayEntries);
      const pct =
        targets.calories > 0 ? Math.min((macros.calories / targets.calories) * 100, 130) : 0;
      days.push({
        label: dayLabel,
        fullLabel,
        calories: Math.round(macros.calories),
        target: targets.calories,
        pct,
        isToday: i === 0,
      });
    }
    return days;
  }, [allEntries, targets.calories]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.screenBg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <FadeIn delay={0}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textPrimary }]}>{getGreeting()}, {displayName}</Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.trackBg }]}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/me')}
          >
            <Text style={styles.avatarEmoji}>👤</Text>
          </TouchableOpacity>
        </View>
      </FadeIn>

      {isLoading ? (
        <>
          <SkeletonCoachBubble />
          <SkeletonMacroRings />
          <SkeletonWeekChart />
          <SkeletonMealList count={3} />
        </>
      ) : (
      <>
      {/* Coach tip */}
      <FadeIn delay={50}>
        <CoachBubble message={coachMessage} />
      </FadeIn>

      {/* Calorie headline + Macro rings */}
      <FadeIn delay={100}>
        <Card style={{ backgroundColor: colors.cardBg }}>
          <View style={styles.calHeader}>
            <View>
              <Text style={[styles.calHeadline, { color: colors.textPrimary }]}>
                {Math.round(dayMacros.calories).toLocaleString()}
              </Text>
              <Text style={[styles.calSubline, { color: colors.textTertiary }]}>of {targets.calories.toLocaleString()} kcal</Text>
            </View>
            <View style={[styles.calPctBadge, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.calPctText, { color: colors.primary }]}>{calPct}%</Text>
            </View>
          </View>

          {/* Calorie progress bar */}
          <View style={[styles.calProgressTrack, { backgroundColor: colors.trackBg }]}>
            <Animated.View
              style={[
                styles.calProgressFill,
                { width: `${Math.min(calPct, 100)}%`, backgroundColor: colors.primary },
                calPct > 100 && { backgroundColor: '#F59E0B' },
              ]}
              entering={FadeInDown.delay(200).duration(600)}
            />
          </View>

          <View style={styles.ringRow}>
            <AnimatedMacroRing
              label="Protein"
              value={dayMacros.protein}
              target={targets.protein}
              color={colors.macroProtein}
              delay={200}
              subtextColor={colors.textTertiary}
            />
            <AnimatedMacroRing
              label="Carbs"
              value={dayMacros.carbs}
              target={targets.carbs}
              color={colors.macroCarbs}
              delay={300}
              subtextColor={colors.textTertiary}
            />
            <AnimatedMacroRing
              label="Fat"
              value={dayMacros.fat}
              target={targets.fat}
              color={colors.macroFat}
              delay={400}
              subtextColor={colors.textTertiary}
            />
            <AnimatedMacroRing
              label="Fibre"
              value={dayMacros.fibre}
              target={targets.fibre}
              color={colors.macroFibre}
              delay={500}
              subtextColor={colors.textTertiary}
            />
          </View>
        </Card>
      </FadeIn>

      {/* Weekly progress */}
      <FadeIn delay={200}>
        <Card style={{ backgroundColor: colors.cardBg }}>
          <View style={styles.weekHeader}>
            <Text style={[styles.weekTitle, { color: colors.textPrimary }]}>This Week</Text>
            <Text style={[styles.weekSubtitle, { color: colors.textTertiary }]}>
              {weekData.filter((d) => d.pct > 0).length} of 7 days tracked
            </Text>
          </View>
          <View style={styles.chartRow}>
            {weekData.map((day, i) => {
              const barHeight = Math.max(4, (day.pct / 130) * 90);
              const isOver = day.pct > 100;
              const barColor = isOver ? '#F59E0B' : day.pct > 0 ? colors.primary : colors.trackBg;
              return (
                <Animated.View
                  key={i}
                  style={styles.chartCol}
                  entering={FadeInDown.delay(300 + i * 50).duration(400).springify().damping(14)}
                >
                  <View style={styles.chartBarTrack}>
                    <View
                      style={[styles.chartBarFill, { height: barHeight, backgroundColor: barColor }]}
                    />
                    <View style={[styles.chartTargetLine, { bottom: (100 / 130) * 90, backgroundColor: colors.border }]} />
                  </View>
                  <Text style={[styles.chartLabel, { color: colors.textTertiary }, day.isToday && { color: colors.primary, fontWeight: '700' }]}>
                    {day.label}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
          <View style={[styles.chartLegend, { borderTopColor: colors.borderLight }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textTertiary }]}>On track</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.legendText, { color: colors.textTertiary }]}>Over</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.legendText, { color: colors.textTertiary }]}>Target</Text>
            </View>
          </View>
        </Card>
      </FadeIn>

      {/* Today's Meals */}
      <FadeIn delay={300}>
        <View style={styles.mealsSection}>
          <View style={styles.mealsSectionHeader}>
            <Text style={[styles.mealsSectionTitle, { color: colors.textPrimary }]}>Today's Meals</Text>
            <Text style={[styles.mealsSectionCount, { color: colors.textTertiary }]}>
              {sortedEntries.length} {sortedEntries.length === 1 ? 'meal' : 'meals'}
            </Text>
          </View>

          {sortedEntries.length > 0 ? (
            sortedEntries.map((entry, idx) => {
              const entryName =
                entry.recipe?.title ||
                (entry.notes?.startsWith('AI: ') ? entry.notes.slice(4) : null) ||
                'Untitled';
              const isAI = !entry.recipe && entry.notes?.startsWith('AI: ');

              const handleEntryPress = () => {
                Vibration.vibrate(10);
                if (entry.recipe) {
                  router.push(`/recipe/${entry.recipe.id}`);
                } else if (isAI) {
                  router.push({
                    pathname: '/ai-meal-detail',
                    params: {
                      title: entryName,
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

              const totalCal = Math.round(
                (entry.calories || entry.recipe?.calories_per_serving || 0) *
                  (entry.servings || 1),
              );
              const totalProtein = Math.round(
                (entry.protein_g || entry.recipe?.protein_per_serving || 0) *
                  (entry.servings || 1),
              );

              return (
                <Animated.View
                  key={entry.id}
                  entering={FadeInDown.delay(350 + idx * 60).duration(300).springify().damping(18)}
                >
                  <TouchableOpacity
                    style={[styles.mealCard, { backgroundColor: colors.cardBg }, idx === 0 && { marginTop: 0 }]}
                    activeOpacity={0.6}
                    onPress={handleEntryPress}
                  >
                    <View style={[styles.mealAccent, { backgroundColor: colors.primary }, isAI && { backgroundColor: colors.aiAccent }]} />
                    <View style={styles.mealCardBody}>
                      <View style={styles.mealCardTop}>
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
                          <Text style={[styles.mealName, { color: colors.textPrimary }]} numberOfLines={1}>{entryName}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.removeBtn, { backgroundColor: colors.destructiveBg }]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={() => handleRemoveMeal(entry.id, entryName)}
                        >
                          <Text style={[styles.removeBtnText, { color: colors.destructive }]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.mealMacroRow}>
                        <View style={styles.mealMacroChip}>
                          <Text style={[styles.mealMacroVal, { color: colors.textLabel }]}>{totalCal}</Text>
                          <Text style={[styles.mealMacroUnit, { color: colors.textTertiary }]}>kcal</Text>
                        </View>
                        <View style={[styles.mealMacroDot, { backgroundColor: colors.border }]} />
                        <View style={styles.mealMacroChip}>
                          <Text style={[styles.mealMacroVal, { color: colors.macroProtein }]}>{totalProtein}g</Text>
                          <Text style={[styles.mealMacroUnit, { color: colors.textTertiary }]}>protein</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No meals planned for today</Text>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                Head to the Plan tab to set up your week, or browse Discover for inspiration.
              </Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primaryBg }]} onPress={() => router.push('/(tabs)/plan')}>
                <Text style={[styles.emptyBtnText, { color: colors.primary }]}>Plan your meals</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Add meal CTA */}
          <TouchableOpacity
            style={[styles.addMealBtn, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}
            activeOpacity={0.6}
            onPress={() => {
              Vibration.vibrate(10);
              router.push('/(tabs)/discover');
            }}
          >
            <View style={[styles.addMealIcon, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.addMealPlus, { color: colors.primary }]}>+</Text>
            </View>
            <Text style={[styles.addMealText, { color: colors.textTertiary }]}>Add a meal or snack</Text>
            <Text style={[styles.addMealArrow, { color: colors.border }]}>›</Text>
          </TouchableOpacity>
        </View>
      </FadeIn>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  date: { fontSize: 14 },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 18 },

  // Calorie headline
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calHeadline: { fontSize: 28, fontWeight: '800' },
  calSubline: { fontSize: 13, marginTop: 1 },
  calPctBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  calPctText: { fontSize: 14, fontWeight: '700' },

  // Calorie progress bar
  calProgressTrack: {
    height: 6,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  calProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Macro rings
  ringRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },

  // Week chart
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekTitle: { fontSize: 15, fontWeight: '700' },
  weekSubtitle: { fontSize: 12 },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  chartCol: { alignItems: 'center', flex: 1 },
  chartBarTrack: {
    width: 24,
    height: 90,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  chartBarFill: { width: 18, borderRadius: 5, minHeight: 4 },
  chartTargetLine: {
    position: 'absolute',
    left: -3,
    right: -3,
    height: 1,
    borderRadius: 1,
  },
  chartLabel: { fontSize: 11, fontWeight: '500', marginTop: 6 },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLine: { width: 12, height: 1.5 },
  legendText: { fontSize: 10 },

  // Meals section
  mealsSection: { marginTop: 4 },
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealsSectionTitle: { fontSize: 17, fontWeight: '700' },
  mealsSectionCount: { fontSize: 13 },

  // Meal card
  mealCard: {
    borderRadius: 14,
    marginTop: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  mealAccent: {
    width: 4,
  },
  mealCardBody: {
    flex: 1,
    padding: 12,
  },
  mealCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
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
  mealType: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 },
  mealName: { fontSize: 15, fontWeight: '600', marginTop: 1 },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 11, fontWeight: '700' },

  // Meal macro row
  mealMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 50,
  },
  mealMacroChip: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  mealMacroVal: { fontSize: 13, fontWeight: '600' },
  mealMacroUnit: { fontSize: 11 },
  mealMacroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 6, paddingHorizontal: 16 },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600' },

  // Add meal CTA
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addMealIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMealPlus: { fontSize: 18, fontWeight: '600' },
  addMealText: { flex: 1, fontSize: 14, fontWeight: '500' },
  addMealArrow: { fontSize: 20 },
});
