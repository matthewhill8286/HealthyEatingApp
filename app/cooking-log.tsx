import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { brand } from '@/constants/Colors';

interface CookingLogEntry {
  id: string;
  user_id: string;
  recipe_id: string;
  cooked_at: string | null;
  servings_made: number | null;
  rating: number | null;
  notes: string | null;
  photo_url: string | null;
  actual_prep_time_min: number | null;
  actual_cook_time_min: number | null;
  modifications: string | null;
  recipes: {
    title: string;
    image_url: string | null;
  } | null;
}

interface Recipe {
  id: string;
  title: string;
  image_url: string | null;
}

const CookingLogScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [entries, setEntries] = useState<CookingLogEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);

  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [servings, setServings] = useState('1');
  const [notes, setNotes] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  const fetchEntries = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cooking_log')
        .select(`
          *,
          recipes(title, image_url)
        `)
        .eq('user_id', user.id)
        .order('cooked_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('Failed to fetch cooking log entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image_url')
        .order('title');

      if (error) throw error;
      setRecipes(data || []);
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchEntries();
  }, [user]);

  const calculateStats = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalCooked = entries.length;
    const thisWeekCount = entries.filter(
      (e) => e.cooked_at && new Date(e.cooked_at) >= weekAgo
    ).length;
    const ratedEntries = entries.filter((e) => e.rating != null);
    const avgRating =
      ratedEntries.length > 0
        ? (
            ratedEntries.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries.length
          ).toFixed(1)
        : '0.0';

    return { totalCooked, thisWeekCount, avgRating };
  };

  const handleSaveEntry = async () => {
    if (!user || !selectedRecipeId) return;

    try {
      setSavingEntry(true);
      const servingsNum = parseFloat(servings) || 1;

      const { error } = await supabase.from('cooking_log').insert([
        {
          user_id: user.id,
          recipe_id: selectedRecipeId,
          cooked_at: new Date().toISOString(),
          servings_made: servingsNum,
          rating: rating || null,
          notes: notes || null,
        },
      ]);

      if (error) throw error;

      setSelectedRecipeId(null);
      setRating(0);
      setServings('1');
      setNotes('');
      setShowLogForm(false);
      await fetchEntries();
    } catch (err) {
      console.error('Failed to save cooking log entry:', err);
    } finally {
      setSavingEntry(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const day = days[date.getDay()];
    const date_num = date.getDate();
    const month = months[date.getMonth()];
    return `${day} ${date_num} ${month}`;
  };

  const renderStars = (rating: number, onRate?: (r: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => onRate && onRate(i)}
          style={{ marginRight: 4 }}
        >
          <Text style={{ fontSize: 24 }}>
            {i <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const stats = calculateStats();

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Cooking Log</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : (
        <>
          {/* Stats Banner */}
          <Card style={styles.statsBanner}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCooked}</Text>
              <Text style={styles.statLabel}>Total Cooked</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.thisWeekCount}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avgRating}</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
          </Card>

          {/* Entries List or Empty State */}
          {entries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No cooking entries yet</Text>
              <Text style={styles.emptySubtitle}>
                Start cooking to build your log!
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.listContainer}
              showsVerticalScrollIndicator={false}
            >
              {entries.map((entry) => (
                <Card key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryTitle}>
                      {entry.recipes?.title || 'Unknown Recipe'}
                    </Text>
                    <Text style={styles.entryDate}>
                      {formatDate(entry.cooked_at || new Date().toISOString())}
                    </Text>
                  </View>

                  <View style={styles.entryContent}>
                    <View style={styles.ratingRow}>
                      {renderStars(Math.round(entry.rating || 0))}
                      <Text style={styles.ratingNumber}>
                        {(entry.rating || 0).toFixed(1)}
                      </Text>
                    </View>

                    <Text style={styles.servingsText}>
                      Servings: {entry.servings_made || 1}
                    </Text>

                    {entry.notes && (
                      <Text
                        style={styles.notesText}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {entry.notes}
                      </Text>
                    )}
                  </View>
                </Card>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </>
      )}

      {/* Floating Log Button & Form */}
      <View style={[styles.floatingContainer, { paddingBottom: insets.bottom }]}>
        {!showLogForm && (
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => setShowLogForm(true)}
          >
            <Text style={styles.floatingButtonText}>Log a Cook</Text>
          </TouchableOpacity>
        )}

        {showLogForm && (
          <Card style={styles.formContainer}>
            <Text style={styles.formTitle}>Log a Cook</Text>

            {/* Recipe Picker */}
            <Text style={styles.formLabel}>Select Recipe</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recipePicker}
            >
              {recipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={[
                    styles.recipeChip,
                    selectedRecipeId === recipe.id && styles.recipeChipSelected,
                  ]}
                  onPress={() => setSelectedRecipeId(recipe.id)}
                >
                  <Text
                    style={[
                      styles.recipeChipText,
                      selectedRecipeId === recipe.id &&
                        styles.recipeChipTextSelected,
                    ]}
                  >
                    {recipe.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Rating */}
            <Text style={styles.formLabel}>Rating</Text>
            <View style={styles.ratingSelector}>
              {renderStars(rating, setRating)}
            </View>

            {/* Servings */}
            <Text style={styles.formLabel}>Servings</Text>
            <View style={styles.servingsControl}>
              <TouchableOpacity
                style={styles.servingsButton}
                onPress={() => {
                  const val = Math.max(0.5, parseFloat(servings) - 0.5);
                  setServings(val.toString());
                }}
              >
                <Text style={styles.servingsButtonText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.servingsInput}
                value={servings}
                onChangeText={setServings}
                keyboardType="decimal-pad"
                placeholder="1"
              />
              <TouchableOpacity
                style={styles.servingsButton}
                onPress={() => {
                  const val = parseFloat(servings) + 0.5;
                  setServings(val.toString());
                }}
              >
                <Text style={styles.servingsButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this cook..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Action Buttons */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => {
                  setShowLogForm(false);
                  setSelectedRecipeId(null);
                  setRating(0);
                  setServings('1');
                  setNotes('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formButton,
                  styles.saveButton,
                  (!selectedRecipeId || savingEntry) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSaveEntry}
                disabled={!selectedRecipeId || savingEntry}
              >
                {savingEntry ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 16,
    color: brand.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  statsBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: brand.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  entryCard: {
    marginBottom: 12,
    paddingVertical: 12,
  },
  entryHeader: {
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  entryDate: {
    fontSize: 12,
    color: '#999',
  },
  entryContent: {
    marginTop: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  servingsText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#777',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  floatingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  floatingButton: {
    backgroundColor: brand.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 0,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
  },
  recipePicker: {
    marginBottom: 8,
    flexGrow: 0,
  },
  recipeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  recipeChipSelected: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  recipeChipText: {
    fontSize: 13,
    color: '#666',
  },
  recipeChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  ratingSelector: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  servingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: brand.primary,
  },
  servingsInput: {
    flex: 1,
    marginHorizontal: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  notesInput: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    fontSize: 13,
    color: '#000',
    marginBottom: 12,
    minHeight: 60,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  formButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  saveButton: {
    backgroundColor: brand.primary,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CookingLogScreen;
