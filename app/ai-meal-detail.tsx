/**
 * AI Meal Detail — shows cooking info for AI-generated meals
 * that don't have a linked recipe in the database.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { brand, macros as macroColors } from '@/constants/Colors';

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🥣',
  morning_snack: '🍎',
  lunch: '🥗',
  afternoon_snack: '🥜',
  dinner: '🍳',
  evening_snack: '🍫',
};

export default function AIMealDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    title: string;
    mealType: string;
    calories: string;
    proteinG: string;
    fatG: string;
    carbsG: string;
    fibreG: string;
    servings: string;
    notes: string;
    planDate: string;
  }>();

  const title = params.title || 'AI Meal';
  const mealType = params.mealType || 'dinner';
  const calories = parseFloat(params.calories || '0');
  const proteinG = parseFloat(params.proteinG || '0');
  const fatG = parseFloat(params.fatG || '0');
  const carbsG = parseFloat(params.carbsG || '0');
  const fibreG = parseFloat(params.fibreG || '0');
  const servings = parseFloat(params.servings || '1');
  const notes = params.notes || '';
  const planDate = params.planDate || '';

  // Parse out the AI notes — strip the "AI: title" prefix if present
  // The notes field format is typically "AI: Title\n\nDescription or instructions"
  let cookingInfo = notes;
  if (cookingInfo.startsWith('AI: ')) {
    // Remove the "AI: Title" line
    const firstNewline = cookingInfo.indexOf('\n');
    if (firstNewline > 0) {
      cookingInfo = cookingInfo.slice(firstNewline).trim();
    } else {
      // Only the title, no extra info
      cookingInfo = '';
    }
  }

  // Try to extract sections from the AI notes
  const sections = parseCookingSections(cookingInfo);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroEmoji}>🤖</Text>
        </View>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI Generated</Text>
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroMealType}>
          {MEAL_EMOJI[mealType] || '🍽️'} {mealType.replace(/_/g, ' ')}
          {planDate ? ` · ${planDate}` : ''}
        </Text>
      </View>

      {/* Macros Card */}
      <Card style={styles.macroCard}>
        <Text style={styles.sectionTitle}>Nutrition per serving</Text>
        <View style={styles.macroRow}>
          <MacroItem label="Calories" value={`${Math.round(calories)}`} unit="kcal" color="#111827" />
          <MacroItem label="Protein" value={`${Math.round(proteinG)}`} unit="g" color={macroColors.protein} />
          <MacroItem label="Carbs" value={`${Math.round(carbsG)}`} unit="g" color={macroColors.carbs} />
          <MacroItem label="Fat" value={`${Math.round(fatG)}`} unit="g" color={macroColors.fat} />
          {fibreG > 0 && (
            <MacroItem label="Fibre" value={`${Math.round(fibreG)}`} unit="g" color="#6B7280" />
          )}
        </View>
        {servings > 1 && (
          <Text style={styles.servingsNote}>
            {servings} servings · {Math.round(calories * servings)} kcal total
          </Text>
        )}
      </Card>

      {/* Cooking Info */}
      {sections.length > 0 ? (
        sections.map((section, i) => (
          <Card key={i} style={styles.sectionCard}>
            {section.heading && (
              <Text style={styles.sectionTitle}>{section.heading}</Text>
            )}
            {section.items.length > 0 ? (
              section.items.map((item, j) => (
                <View key={j} style={styles.listItem}>
                  <Text style={styles.listBullet}>{section.isNumbered ? `${j + 1}.` : '•'}</Text>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>{section.body}</Text>
            )}
          </Card>
        ))
      ) : cookingInfo ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.bodyText}>{cookingInfo}</Text>
        </Card>
      ) : (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How to prepare</Text>
          <Text style={styles.bodyText}>
            This meal was suggested by the AI coach based on your nutritional goals and preferences.
            Since it's an AI-generated suggestion, detailed cooking instructions aren't available yet.
          </Text>
          <View style={styles.tipBox}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipText}>
              Tip: Search for "{title}" in the Discover tab to find a full recipe with step-by-step instructions!
            </Text>
          </View>
        </Card>
      )}

      {/* Find Recipe Button */}
      <TouchableOpacity
        style={styles.findRecipeBtn}
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/discover')}
      >
        <Text style={styles.findRecipeBtnText}>🔍  Find similar recipes</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MacroItem({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.macroItem}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

type Section = {
  heading: string;
  body: string;
  items: string[];
  isNumbered: boolean;
};

function parseCookingSections(text: string): Section[] {
  if (!text.trim()) return [];

  const sections: Section[] = [];
  const lines = text.split('\n');
  let currentSection: Section = { heading: '', body: '', items: [], isNumbered: false };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if it's a heading (e.g., "## Ingredients", "Ingredients:", "**Ingredients**")
    const headingMatch = trimmed.match(/^(?:#{1,3}\s+)?(?:\*\*)?([A-Za-z\s]+?)(?:\*\*)?:?\s*$/);
    if (
      headingMatch &&
      trimmed.length < 40 &&
      (trimmed.startsWith('#') || trimmed.endsWith(':') || trimmed.startsWith('**'))
    ) {
      if (currentSection.heading || currentSection.body || currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { heading: headingMatch[1].trim(), body: '', items: [], isNumbered: false };
      continue;
    }

    // Check if it's a list item
    const listMatch = trimmed.match(/^(?:[-•*]|\d+[.)]\s)\s*(.*)/);
    if (listMatch) {
      currentSection.items.push(listMatch[1]);
      if (/^\d+[.)]/.test(trimmed)) currentSection.isNumbered = true;
      continue;
    }

    // Otherwise it's body text
    currentSection.body += (currentSection.body ? '\n' : '') + trimmed;
  }

  if (currentSection.heading || currentSection.body || currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  backArrow: { fontSize: 20, color: '#111827' },
  hero: { alignItems: 'center', marginBottom: 20 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#F3E8FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroEmoji: { fontSize: 36 },
  aiBadge: {
    backgroundColor: '#F3E8FF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  aiBadgeText: { fontSize: 11, fontWeight: '700', color: '#7C3AED', letterSpacing: 0.3 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  heroMealType: {
    fontSize: 14, color: '#6B7280', marginTop: 4, textTransform: 'capitalize',
  },
  macroCard: { paddingVertical: 16 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 20, fontWeight: '700' },
  macroUnit: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  macroLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  servingsNote: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 10 },
  sectionCard: { paddingVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  bodyText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  listItem: { flexDirection: 'row', paddingVertical: 4, paddingRight: 16 },
  listBullet: { fontSize: 14, color: brand.primary, fontWeight: '600', width: 24 },
  listText: { fontSize: 14, color: '#4B5563', lineHeight: 20, flex: 1 },
  tipBox: {
    flexDirection: 'row', backgroundColor: '#FEF9C3', borderRadius: 12,
    padding: 12, marginTop: 14, gap: 8, alignItems: 'flex-start',
  },
  tipEmoji: { fontSize: 16 },
  tipText: { fontSize: 13, color: '#713F12', lineHeight: 18, flex: 1 },
  findRecipeBtn: {
    backgroundColor: brand.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  findRecipeBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
