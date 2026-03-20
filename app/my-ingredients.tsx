import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { brand, macros, text } from '@/constants/Colors';
import type { Database } from '@/types/database.types';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];

const CATEGORY_COLORS: Record<string, string> = {
  protein: '#3B82F6',
  vegetable: '#16A34A',
  grain: '#F59E0B',
  oil: '#FBBF24',
  fruit: '#A855F7',
  dairy: '#EC4899',
  spice: '#EF4444',
  legume: '#8B5CF6',
  nut: '#D97706',
  seed: '#CA8A04',
  herb: '#10B981',
  condiment: '#6366F1',
};

function getCategoryColor(category: string | null): string {
  if (!category) return '#9CA3AF';
  const normalized = category.toLowerCase();
  return CATEGORY_COLORS[normalized] || '#9CA3AF';
}

function formatUnit(unit: string | null): string {
  if (!unit) return '';
  const unitMap: Record<string, string> = {
    g: 'g',
    mg: 'mg',
    mcg: 'mcg',
    ml: 'ml',
    l: 'l',
    tsp: 'tsp',
    tbsp: 'tbsp',
    cup: 'cup',
    oz: 'oz',
    lb: 'lb',
    piece: 'piece',
    slice: 'slice',
    clove: 'clove',
    bunch: 'bunch',
    pinch: 'pinch',
    to_taste: 'to taste',
  };
  return unitMap[unit] || unit;
}

function IngredientCard({ ingredient, expanded, onToggle }: { ingredient: Ingredient; expanded: boolean; onToggle: () => void }) {
  const categoryColor = getCategoryColor(ingredient.category);
  const calories = Math.round(ingredient.calories || 0);
  const protein = Math.round(ingredient.protein_g || 0);
  const carbs = Math.round(ingredient.total_carbs_g || 0);
  const fat = Math.round(ingredient.total_fat_g || 0);

  return (
    <Card style={styles.ingredientCard}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.nameSection}>
            <Text style={styles.ingredientName}>{ingredient.name}</Text>
            {ingredient.category && (
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                <Text style={styles.categoryBadgeText}>
                  {ingredient.category.charAt(0).toUpperCase() + ingredient.category.slice(1)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.expandIcon}>{expanded ? '−' : '+'}</Text>
        </View>

        <Text style={styles.macroSummary}>
          {calories} kcal · {protein}g P · {carbs}g C · {fat}g F
        </Text>

        {ingredient.default_unit && (
          <Text style={styles.defaultUnit}>
            Default: {formatUnit(ingredient.default_unit)}
          </Text>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          {ingredient.description && (
            <View style={styles.descriptionRow}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionValue}>{ingredient.description}</Text>
            </View>
          )}

          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={[styles.nutritionValue, { color: macros.protein }]}>
                {(ingredient.protein_g || 0).toFixed(1)}g
              </Text>
            </View>

            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Carbs</Text>
              <Text style={[styles.nutritionValue, { color: macros.carbs }]}>
                {(ingredient.total_carbs_g || 0).toFixed(1)}g
              </Text>
            </View>

            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Fat</Text>
              <Text style={[styles.nutritionValue, { color: macros.fat }]}>
                {(ingredient.total_fat_g || 0).toFixed(1)}g
              </Text>
            </View>

            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Fibre</Text>
              <Text style={[styles.nutritionValue, { color: macros.fibre }]}>
                {(ingredient.dietary_fibre_g || 0).toFixed(1)}g
              </Text>
            </View>

            {ingredient.calcium_mg && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Calcium</Text>
                <Text style={styles.nutritionValue}>{ingredient.calcium_mg.toFixed(0)}mg</Text>
              </View>
            )}

            {ingredient.iron_mg && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Iron</Text>
                <Text style={styles.nutritionValue}>{ingredient.iron_mg.toFixed(2)}mg</Text>
              </View>
            )}

            {ingredient.sodium_mg && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Sodium</Text>
                <Text style={styles.nutritionValue}>{ingredient.sodium_mg.toFixed(0)}mg</Text>
              </View>
            )}

            {ingredient.potassium_mg && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Potassium</Text>
                <Text style={styles.nutritionValue}>{ingredient.potassium_mg.toFixed(0)}mg</Text>
              </View>
            )}

            {ingredient.vitamin_c_mg && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Vitamin C</Text>
                <Text style={styles.nutritionValue}>{ingredient.vitamin_c_mg.toFixed(1)}mg</Text>
              </View>
            )}

            {ingredient.vitamin_a_mcg && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Vitamin A</Text>
                <Text style={styles.nutritionValue}>{ingredient.vitamin_a_mcg.toFixed(0)}mcg</Text>
              </View>
            )}

            {ingredient.vitamin_d_mcg && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Vitamin D</Text>
                <Text style={styles.nutritionValue}>{ingredient.vitamin_d_mcg.toFixed(1)}mcg</Text>
              </View>
            )}

            {ingredient.zinc_mg && (
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>Zinc</Text>
                <Text style={styles.nutritionValue}>{ingredient.zinc_mg.toFixed(2)}mg</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Card>
  );
}

export default function MyIngredientsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');

      if (error) throw error;
      setIngredients(data || []);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    ingredients.forEach((ing) => {
      if (ing.category) {
        cats.add(ing.category.charAt(0).toUpperCase() + ing.category.slice(1));
      }
    });
    const sorted = Array.from(cats).sort();
    return ['All', ...sorted];
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    let result = ingredients;

    if (searchText.trim().length > 0) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (ing) =>
          ing.name.toLowerCase().includes(query) ||
          (ing.description && ing.description.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'All') {
      result = result.filter(
        (ing) =>
          ing.category &&
          ing.category.charAt(0).toUpperCase() + ing.category.slice(1) === selectedCategory
      );
    }

    return result;
  }, [ingredients, searchText, selectedCategory]);

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedCategory('All');
  };

  const hasActiveFilters = searchText.length > 0 || selectedCategory !== 'All';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Ingredients</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {categories.map((cat) => {
          const isActive = cat === selectedCategory;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {hasActiveFilters && (
        <TouchableOpacity onPress={handleClearFilters} style={styles.clearAllRow} activeOpacity={0.7}>
          <Text style={styles.clearAllText}>Clear filters</Text>
        </TouchableOpacity>
      )}

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={brand.primary} />
        </View>
      )}

      {!isLoading && filteredIngredients.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🥕</Text>
          <Text style={styles.emptyStateText}>
            {searchText ? `No ingredients matching "${searchText}"` : 'No ingredients in this category'}
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={handleClearFilters} style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {filteredIngredients.map((ingredient) => (
        <IngredientCard
          key={ingredient.id}
          ingredient={ingredient}
          expanded={expandedIds.has(ingredient.id)}
          onToggle={() => toggleExpanded(ingredient.id)}
        />
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: text.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: text.primary,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: text.primary,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 14,
    color: text.tertiary,
    fontWeight: '600',
  },
  categoryRow: {
    marginBottom: 12,
    flexGrow: 0,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: text.secondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  clearAllRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: brand.primary,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateEmoji: {
    fontSize: 48,
    opacity: 0.4,
  },
  emptyStateText: {
    fontSize: 15,
    color: text.tertiary,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyStateButton: {
    backgroundColor: brand.primaryBg,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: brand.primary,
  },
  ingredientCard: {
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '700',
    color: text.primary,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expandIcon: {
    fontSize: 20,
    color: text.secondary,
    fontWeight: '600',
  },
  macroSummary: {
    fontSize: 13,
    color: text.secondary,
    marginBottom: 4,
  },
  defaultUnit: {
    fontSize: 12,
    color: text.tertiary,
    fontStyle: 'italic',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  descriptionRow: {
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  descriptionValue: {
    fontSize: 13,
    color: text.primary,
    lineHeight: 18,
  },
  nutritionGrid: {
    gap: 8,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: text.secondary,
    fontWeight: '500',
  },
  nutritionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: macros.protein,
  },
});
