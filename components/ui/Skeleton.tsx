/**
 * Skeleton loading components — smooth shimmer placeholders
 * that match the shape of real content for a polished loading UX.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Card } from './Card';

// ---------------------------------------------------------------------------
// Core shimmer bar
// ---------------------------------------------------------------------------

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({
  width = '100%',
  height = 14,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Circle variant (avatars, emoji slots)
// ---------------------------------------------------------------------------

export function SkeletonCircle({ size = 44, style }: { size?: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

// ---------------------------------------------------------------------------
// Pre-composed skeleton blocks for common layouts
// ---------------------------------------------------------------------------

/** Skeleton for a macro ring row (4 circles + labels) */
export function SkeletonMacroRings() {
  return (
    <Card>
      <Skeleton width={120} height={12} style={{ marginBottom: 16 }} />
      <View style={s.ringRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={s.ringItem}>
            <SkeletonCircle size={52} />
            <Skeleton width={36} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
      <Skeleton width={140} height={12} style={{ alignSelf: 'center', marginTop: 10 }} />
    </Card>
  );
}

/** Skeleton for a single meal slot (thumb + 2 lines of text) */
export function SkeletonMealSlot() {
  return (
    <View style={s.mealSlot}>
      <Skeleton width={48} height={48} borderRadius={12} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width={80} height={10} />
        <Skeleton width="70%" height={14} />
        <Skeleton width={120} height={10} />
      </View>
    </View>
  );
}

/** Skeleton for a meal list card with N entries */
export function SkeletonMealList({ count = 3 }: { count?: number }) {
  return (
    <Card>
      <Skeleton width={110} height={12} style={{ marginBottom: 12 }} />
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMealSlot key={i} />
      ))}
    </Card>
  );
}

/** Skeleton for the weekly bar chart */
export function SkeletonWeekChart() {
  return (
    <Card>
      <Skeleton width={90} height={12} style={{ marginBottom: 16 }} />
      <View style={s.chartRow}>
        {[40, 65, 30, 80, 55, 70, 20].map((h, i) => (
          <View key={i} style={s.chartBar}>
            <Skeleton width={20} height={h} borderRadius={6} />
            <Skeleton width={16} height={8} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Skeleton for the coach bubble */
export function SkeletonCoachBubble() {
  return (
    <Card style={{ backgroundColor: '#F0FDF4' }}>
      <View style={s.coachRow}>
        <SkeletonCircle size={36} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="90%" height={12} />
          <Skeleton width="60%" height={12} />
        </View>
      </View>
    </Card>
  );
}

/** Skeleton for the day selector row */
export function SkeletonDaySelector() {
  return (
    <View style={s.dayRow}>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Skeleton key={i} width={48} height={52} borderRadius={12} style={{ marginRight: 8 }} />
      ))}
    </View>
  );
}

/** Skeleton for a daily macro summary bar */
export function SkeletonMacroBar() {
  return (
    <Card style={{ paddingVertical: 12 }}>
      <View style={s.macroBarRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ alignItems: 'center', gap: 4 }}>
            <Skeleton width={40} height={18} />
            <Skeleton width={30} height={10} />
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Skeleton for a recipe card in a grid */
export function SkeletonRecipeCard() {
  return (
    <View style={s.recipeCard}>
      <Skeleton width="100%" height={120} borderRadius={12} />
      <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
      <Skeleton width="50%" height={10} style={{ marginTop: 4 }} />
      <View style={s.recipeChipRow}>
        <Skeleton width={50} height={20} borderRadius={8} />
        <Skeleton width={65} height={20} borderRadius={8} />
      </View>
    </View>
  );
}

/** Skeleton for a recipe grid (discover page) */
export function SkeletonRecipeGrid({ count = 4 }: { count?: number }) {
  return (
    <View style={s.recipeGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRecipeCard key={i} />
      ))}
    </View>
  );
}

/** Skeleton for a shopping list */
export function SkeletonShoppingList({ count = 5 }: { count?: number }) {
  return (
    <Card>
      <Skeleton width={130} height={12} style={{ marginBottom: 14 }} />
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={s.shopItem}>
          <Skeleton width={22} height={22} borderRadius={6} />
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width={`${60 + (i % 3) * 10}%`} height={14} />
            <Skeleton width={80} height={10} />
          </View>
          <Skeleton width={40} height={12} />
        </View>
      ))}
    </Card>
  );
}

/** Skeleton for the profile/Me header */
export function SkeletonProfileHeader() {
  return (
    <View style={s.profileHeader}>
      <SkeletonCircle size={72} />
      <Skeleton width={140} height={18} style={{ marginTop: 10 }} />
      <Skeleton width={180} height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

/** Skeleton for the profile stats row */
export function SkeletonProfileStats() {
  return (
    <Card>
      <View style={s.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ alignItems: 'center', gap: 4 }}>
            <Skeleton width={36} height={22} />
            <Skeleton width={50} height={10} />
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Skeleton for the recipe detail page */
export function SkeletonRecipeDetail() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
      {/* Hero */}
      <Skeleton width="100%" height={160} borderRadius={20} style={{ marginBottom: 16 }} />
      {/* Title + description */}
      <Skeleton width="75%" height={22} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={12} style={{ marginBottom: 4 }} />
      <Skeleton width="60%" height={12} style={{ marginBottom: 16 }} />
      {/* Meta chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Skeleton width={70} height={28} borderRadius={8} />
        <Skeleton width={80} height={28} borderRadius={8} />
        <Skeleton width={60} height={28} borderRadius={8} />
      </View>
      {/* Nutrition card */}
      <Card>
        <Skeleton width={140} height={12} style={{ marginBottom: 12 }} />
        <Skeleton width={60} height={32} style={{ alignSelf: 'center', marginBottom: 16 }} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Skeleton width={60} height={12} />
            <Skeleton height={6} style={{ flex: 1 }} borderRadius={3} />
            <Skeleton width={40} height={12} />
          </View>
        ))}
      </Card>
      {/* Ingredients */}
      <Card>
        <Skeleton width={100} height={12} style={{ marginBottom: 12 }} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={s.mealSlot}>
            <SkeletonCircle size={28} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={`${50 + i * 8}%`} height={14} />
            </View>
            <Skeleton width={40} height={12} />
          </View>
        ))}
      </Card>
      {/* Method */}
      <Card>
        <Skeleton width={70} height={12} style={{ marginBottom: 12 }} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <SkeletonCircle size={28} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width="100%" height={12} />
              <Skeleton width="75%" height={12} />
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Local styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  ringRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  ringItem: { alignItems: 'center' },
  mealSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 90,
  },
  chartBar: { alignItems: 'center' },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayRow: { flexDirection: 'row', marginBottom: 16 },
  macroBarRow: { flexDirection: 'row', justifyContent: 'space-around' },
  recipeCard: {
    width: '48%',
    marginBottom: 12,
  },
  recipeChipRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  recipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  profileHeader: { alignItems: 'center', paddingVertical: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
});
