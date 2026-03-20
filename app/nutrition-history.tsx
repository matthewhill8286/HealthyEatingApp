import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { brand, macros as macroColors, text as textColors } from '@/constants/Colors';
import type { Tables } from '@/types/database.types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEAL_TYPE_ORDER: Record<string, number> = {
  breakfast: 0,
  morning_snack: 1,
  lunch: 2,
  afternoon_snack: 3,
  dinner: 4,
  evening_snack: 5,
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  morning_snack: 'Morning Snack',
  lunch: 'Lunch',
  afternoon_snack: 'Afternoon Snack',
  dinner: 'Dinner',
  evening_snack: 'Evening Snack',
};

type MealPlanEntry = Tables<'meal_plan_entries'> & {
  recipes: Tables<'recipes'> | null;
};

type DailyNutrition = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
};

type GroupedEntry = {
  id: string;
  meal_type: string;
  recipe_title: string;
  calories: number;
  servings: number;
};

export default function NutritionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const { profile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchHistoryData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

        const startDate = sevenDaysAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('meal_plan_entries')
          .select(
            `
            id,
            meal_type,
            plan_date,
            calories,
            protein_g,
            fat_g,
            carbs_g,
            fibre_g,
            notes,
            servings,
            recipe_id,
            recipes (
              id,
              title,
              calories_per_serving,
              protein_per_serving,
              fat_per_serving,
              carbs_per_serving,
              fibre_per_serving
            )
          `
          )
          .gte('plan_date', startDate)
          .lte('plan_date', endDate)
          .order('plan_date', { ascending: false });

        if (error) {
          console.error('Error fetching meal plan entries:', error);
          setEntries([]);
        } else {
          setEntries((data || []) as MealPlanEntry[]);
        }
      } catch (err) {
        console.error('Error fetching nutrition history:', err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [user]);

  const last7Days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      const dayIdx = date.getDay();
      const adjustedIdx = dayIdx === 0 ? 6 : dayIdx - 1;
      return {
        name: DAYS[adjustedIdx],
        num: date.getDate(),
        dateStr: date.toISOString().split('T')[0],
      };
    });
  }, []);

  const selectedDate = last7Days[selectedDayIdx]?.dateStr || '';

  const selectedDayEntries = useMemo(
    () => entries.filter((e) => e.plan_date === selectedDate),
    [entries, selectedDate]
  );

  const dailyNutrition = useMemo<DailyNutrition>(() => {
    return selectedDayEntries.reduce(
      (acc, entry) => {
        const calories = entry.calories || (entry.recipes?.calories_per_serving || 0);
        const protein_g = entry.protein_g || (entry.recipes?.protein_per_serving || 0);
        const carbs_g = entry.carbs_g || (entry.recipes?.carbs_per_serving || 0);
        const fat_g = entry.fat_g || (entry.recipes?.fat_per_serving || 0);
        const fibre_g = entry.fibre_g || (entry.recipes?.fibre_per_serving || 0);
        const servings = entry.servings || 1;

        return {
          calories: acc.calories + calories * servings,
          protein_g: acc.protein_g + protein_g * servings,
          carbs_g: acc.carbs_g + carbs_g * servings,
          fat_g: acc.fat_g + fat_g * servings,
          fibre_g: acc.fibre_g + fibre_g * servings,
        };
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0 }
    );
  }, [selectedDayEntries]);

  const groupedByMealType = useMemo<Record<string, GroupedEntry[]>>(() => {
    const groups: Record<string, GroupedEntry[]> = {};

    selectedDayEntries.forEach((entry) => {
      const mealType = entry.meal_type as string;
      if (!groups[mealType]) {
        groups[mealType] = [];
      }

      let recipeName = 'Unknown Meal';

      if (entry.recipe_id && entry.recipes) {
        recipeName = entry.recipes.title;
      } else if (entry.notes && entry.notes.startsWith('AI: ')) {
        recipeName = entry.notes.substring(4);
      } else if (entry.notes) {
        recipeName = entry.notes;
      }

      groups[mealType].push({
        id: entry.id,
        meal_type: mealType,
        recipe_title: recipeName,
        calories: entry.calories || (entry.recipes?.calories_per_serving || 0),
        servings: entry.servings || 1,
      });
    });

    const sortedGroups: Record<string, GroupedEntry[]> = {};
    Object.keys(groups)
      .sort((a, b) => (MEAL_TYPE_ORDER[a] ?? 999) - (MEAL_TYPE_ORDER[b] ?? 999))
      .forEach((mealType) => {
        sortedGroups[mealType] = groups[mealType];
      });

    return sortedGroups;
  }, [selectedDayEntries]);

  const targetCalories = profile?.daily_calorie_target || 2000;
  const targetProtein = profile?.daily_protein_g || 150;
  const targetCarbs = profile?.daily_carbs_g || 225;
  const targetFat = profile?.daily_fat_g || 65;
  const targetFibre = profile?.daily_fibre_g || 25;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F9FAFB' },
      ]}
    >
      <View style={[styles.header, { paddingHorizontal: 16 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: brand.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colorScheme === 'dark' ? '#F9FAFB' : '#111827' }]}>
          Nutrition History
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateSelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {last7Days.map((day, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dateChip,
                  idx === selectedDayIdx && [
                    styles.dateChipActive,
                    { backgroundColor: brand.primary },
                  ],
                ]}
                onPress={() => setSelectedDayIdx(idx)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateChipDay,
                    idx === selectedDayIdx && styles.dateChipTextActive,
                  ]}
                >
                  {day.name}
                </Text>
                <Text
                  style={[
                    styles.dateChipNum,
                    idx === selectedDayIdx && styles.dateChipTextActive,
                  ]}
                >
                  {day.num}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={brand.primary} />
          </View>
        ) : selectedDayEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text
              style={[
                styles.emptyText,
                { color: colorScheme === 'dark' ? '#9CA3AF' : textColors.secondary },
              ]}
            >
              No meals logged for this day
            </Text>
          </View>
        ) : (
          <>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text
                  style={[
                    styles.summaryTitle,
                    { color: colorScheme === 'dark' ? '#F9FAFB' : '#111827' },
                  ]}
                >
                  Daily Summary
                </Text>
              </View>

              <View style={styles.calorieRow}>
                <View style={styles.calorieCol}>
                  <Text
                    style={[
                      styles.calorieVal,
                      { color: colorScheme === 'dark' ? '#F9FAFB' : '#111827' },
                    ]}
                  >
                    {Math.round(dailyNutrition.calories)}
                  </Text>
                  <Text style={[styles.calorieLabel, { color: textColors.secondary }]}>kcal</Text>
                </View>
                <View style={styles.calorieCol}>
                  <Text style={[styles.calorieTarget, { color: textColors.secondary }]}>
                    {Math.round(targetCalories)}
                  </Text>
                  <Text style={[styles.calorieLabel, { color: textColors.tertiary }]}>target</Text>
                </View>
              </View>

              <View style={styles.macroGrid}>
                <MacroProgress
                  label="Protein"
                  consumed={dailyNutrition.protein_g}
                  target={targetProtein}
                  color={macroColors.protein}
                  colorScheme={colorScheme}
                  unit="g"
                />
                <MacroProgress
                  label="Carbs"
                  consumed={dailyNutrition.carbs_g}
                  target={targetCarbs}
                  color={macroColors.carbs}
                  colorScheme={colorScheme}
                  unit="g"
                />
                <MacroProgress
                  label="Fat"
                  consumed={dailyNutrition.fat_g}
                  target={targetFat}
                  color={macroColors.fat}
                  colorScheme={colorScheme}
                  unit="g"
                />
                <MacroProgress
                  label="Fibre"
                  consumed={dailyNutrition.fibre_g}
                  target={targetFibre}
                  color={macroColors.fibre}
                  colorScheme={colorScheme}
                  unit="g"
                />
              </View>
            </Card>

            <Text
              style={[
                styles.mealsTitle,
                { color: colorScheme === 'dark' ? '#F9FAFB' : '#111827' },
              ]}
            >
              Meals
            </Text>

            {Object.entries(groupedByMealType).map(([mealType, items]) => (
              <View key={mealType}>
                <Text
                  style={[
                    styles.mealTypeHeader,
                    { color: colorScheme === 'dark' ? '#D1D5DB' : textColors.label },
                  ]}
                >
                  {MEAL_TYPE_LABELS[mealType] || mealType}
                </Text>

                {items.map((item) => (
                  <Card key={item.id} style={styles.mealCard}>
                    <View style={styles.mealRow}>
                      <View style={styles.mealInfo}>
                        <Text
                          style={[
                            styles.mealName,
                            {
                              color: colorScheme === 'dark' ? '#F9FAFB' : '#111827',
                            },
                          ]}
                        >
                          {item.recipe_title}
                        </Text>
                        <Text
                          style={[
                            styles.mealServings,
                            {
                              color:
                                colorScheme === 'dark' ? '#9CA3AF' : textColors.secondary,
                            },
                          ]}
                        >
                          {item.servings > 1 ? `${item.servings} servings` : '1 serving'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.mealCalories,
                          {
                            color: colorScheme === 'dark' ? '#F9FAFB' : '#111827',
                          },
                        ]}
                      >
                        {Math.round(item.calories * item.servings)} kcal
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface MacroProgressProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  colorScheme: string | null | undefined;
  unit: string;
}

function MacroProgress({
  label,
  consumed,
  target,
  color,
  colorScheme,
  unit,
}: MacroProgressProps) {
  const percentage = Math.min(100, (consumed / target) * 100);

  return (
    <View style={styles.macroItem}>
      <View style={styles.macroLabelRow}>
        <Text
          style={[
            styles.macroName,
            { color: colorScheme === 'dark' ? '#D1D5DB' : textColors.label },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.macroValue,
            { color: colorScheme === 'dark' ? '#F9FAFB' : '#111827' },
          ]}
        >
          {Math.round(consumed)}/{Math.round(target)}
          {unit}
        </Text>
      </View>
      <View
        style={[
          styles.progressBar,
          { backgroundColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB' },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  dateSelector: {
    marginBottom: 20,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateChipActive: {
    borderColor: brand.primary,
  },
  dateChipDay: {
    fontSize: 12,
    fontWeight: '600',
    color: textColors.secondary,
  },
  dateChipNum: {
    fontSize: 14,
    fontWeight: '700',
    color: textColors.primary,
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  summaryHeader: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  calorieCol: {
    alignItems: 'flex-start',
  },
  calorieVal: {
    fontSize: 32,
    fontWeight: '700',
  },
  calorieLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  calorieTarget: {
    fontSize: 14,
    fontWeight: '600',
  },
  macroGrid: {
    gap: 12,
  },
  macroItem: {
    marginBottom: 12,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroName: {
    fontSize: 14,
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  mealsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  mealTypeHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 12,
  },
  mealCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
  },
  mealServings: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
});
