import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonShoppingList } from '@/components/ui/Skeleton';
import { useShoppingList } from '@/hooks/useShoppingList';
import { brand } from '@/constants/Colors';

const CATEGORY_EMOJI: Record<string, string> = {
  protein: '🥩', vegetable: '🥬', fruit: '🍎', grain: '🌾',
  dairy: '🥛', dairy_alt: '🥛', legume: '🫘', seed: '🌱',
  nut: '🥜', oil: '🫒', spice: '🧂', other: '📦',
};

const CATEGORY_LABEL: Record<string, string> = {
  protein: 'Protein',
  vegetable: 'Vegetables',
  fruit: 'Fruit',
  grain: 'Grains & Cereals',
  dairy: 'Dairy',
  dairy_alt: 'Dairy Alternatives',
  legume: 'Legumes',
  seed: 'Seeds',
  nut: 'Nuts',
  oil: 'Oils & Fats',
  spice: 'Spices & Seasonings',
  other: 'Other',
};

const CATEGORY_ORDER = ['protein', 'vegetable', 'fruit', 'dairy', 'dairy_alt', 'grain', 'legume', 'nut', 'seed', 'oil', 'spice', 'other'];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { list, isLoading, isGenerating, toggleItem, generateFromPlan, refetch } = useShoppingList();
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleGenerate = async () => {
    const result = await generateFromPlan();
    if (!result.success) {
      Alert.alert('Could not generate list', result.error || 'Something went wrong.');
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const hasRealData = !!list && list.items.length > 0;

  const sortedGroups = useMemo(() => {
    if (!list) return [];
    const groups: Record<string, typeof list.items> = {};
    for (const item of list.items) {
      const cat = item.ingredient?.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return CATEGORY_ORDER
      .filter((cat) => groups[cat] && groups[cat].length > 0)
      .map((cat) => ({ category: cat, items: groups[cat] }))
      .concat(
        Object.keys(groups)
          .filter((cat) => !CATEGORY_ORDER.includes(cat))
          .map((cat) => ({ category: cat, items: groups[cat] }))
      );
  }, [list]);

  const totalItems = hasRealData ? list!.items.length : 0;
  const checkedItems = hasRealData ? list!.items.filter((i) => i.status === 'purchased').length : 0;
  const progressPct = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={brand.primary} />}
    >
      {/* Header */}
      <Text style={styles.title}>Shopping List</Text>
      {hasRealData ? (
        <Text style={styles.subtitle}>
          {checkedItems} of {totalItems} items
        </Text>
      ) : (
        <Text style={styles.subtitle}>Build your list from your meal plan</Text>
      )}

      {/* Progress bar */}
      {hasRealData && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{Math.round(progressPct)}% complete</Text>
        </View>
      )}

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateBtn, hasRealData && styles.generateBtnSecondary]}
        onPress={handleGenerate}
        activeOpacity={0.7}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator size="small" color={hasRealData ? brand.primary : '#FFFFFF'} />
        ) : (
          <Text style={[styles.generateBtnText, hasRealData && styles.generateBtnTextSecondary]}>
            {hasRealData ? '🔄  Rebuild from Meal Plan' : '🛒  Generate from Meal Plan'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Shopping list */}
      {hasRealData ? (
        sortedGroups.map(({ category, items }) => {
          const isCollapsed = collapsedCategories.has(category);
          const catChecked = items.filter((i) => i.status === 'purchased').length;
          const allDone = catChecked === items.length;

          return (
            <View key={category} style={styles.categorySection}>
              <TouchableOpacity
                style={styles.categoryHeader}
                activeOpacity={0.6}
                onPress={() => toggleCategory(category)}
              >
                <Text style={styles.categoryEmoji}>
                  {CATEGORY_EMOJI[category] || '📦'}
                </Text>
                <Text style={[styles.categoryTitle, allDone && styles.categoryTitleDone]}>
                  {CATEGORY_LABEL[category] || category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                <Text style={styles.categoryCount}>
                  {catChecked}/{items.length}
                </Text>
                <Text style={styles.categoryChevron}>{isCollapsed ? '▸' : '▾'}</Text>
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={styles.itemList}>
                  {items.map((item) => {
                    const isDone = item.status === 'purchased';
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.shopItem}
                        onPress={() => toggleItem(item.id, item.status)}
                        activeOpacity={0.6}
                      >
                        <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                          {isDone && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.itemName, isDone && styles.itemNameDone]} numberOfLines={1}>
                          {item.ingredient?.name || item.custom_item_name || 'Item'}
                        </Text>
                        {(item.quantity || item.unit) && (
                          <View style={styles.qtyBadge}>
                            <Text style={styles.qtyText}>
                              {item.quantity ? `${item.quantity}` : ''}{item.unit ? ` ${item.unit}` : ''}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      ) : (
        isLoading ? (
          <SkeletonShoppingList count={6} />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyTitle}>No shopping list yet</Text>
            <Text style={styles.emptyText}>
              Add meals to your plan, then tap the button above to automatically build your shopping list from all the recipe ingredients.
            </Text>
          </View>
        )
      )}

      {/* Completion celebration */}
      {hasRealData && checkedItems === totalItems && totalItems > 0 && (
        <View style={styles.doneCard}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>All done!</Text>
          <Text style={styles.doneText}>You've got everything on the list.</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 12 },

  // Progress
  progressSection: { marginBottom: 14 },
  progressTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: brand.primary,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },

  // Generate button
  generateBtn: {
    backgroundColor: brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  generateBtnTextSecondary: { color: '#374151' },

  // Category section
  categorySection: {
    marginBottom: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  categoryEmoji: { fontSize: 18 },
  categoryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  categoryTitleDone: { color: '#9CA3AF' },
  categoryCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  categoryChevron: { fontSize: 12, color: '#9CA3AF', width: 16, textAlign: 'center' },

  // Item list
  itemList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: brand.primary, borderColor: brand.primary },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  itemName: { flex: 1, fontSize: 14, color: '#111827' },
  itemNameDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  qtyBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  qtyText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

  // Done card
  doneCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  doneEmoji: { fontSize: 36, marginBottom: 8 },
  doneTitle: { fontSize: 17, fontWeight: '700', color: '#16A34A', marginBottom: 4 },
  doneText: { fontSize: 14, color: '#6B7280' },
});
