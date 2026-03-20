import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useCookingStats } from '@/hooks/useCookingStats';
import { brand, macros as macroColors } from '@/constants/Colors';

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose Weight',
  maintain_weight: 'Maintain',
  gain_muscle: 'Gain Muscle',
  improve_health: 'Improve Health',
  increase_energy: 'More Energy',
  eat_cleaner: 'Eat Cleaner',
};

const MENU_ITEMS = [
  { emoji: '⚙️', label: 'Preferences & Diet', bg: '#FEF3C7', route: '/edit-profile' },
  { emoji: '🎯', label: 'Macro Targets', bg: '#DCFCE7', route: '/edit-profile' },
  { emoji: '🧠', label: 'AI Coach Settings', bg: '#FCE7F3', route: '/coach-settings' },
  { emoji: '📊', label: 'Nutrition History', bg: '#DBEAFE', route: '/nutrition-history' },
  { emoji: '🍽️', label: 'Cooking Log', bg: '#F3E8FF', route: '/cooking-log' },
  { emoji: '🫙', label: 'My Ingredients', bg: '#FEF3C7', route: '/my-ingredients' },
];

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { profile, refetch } = useProfile();
  const { stats } = useCookingStats();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const goalKey = profile?.goal || 'improve_health';
  const goalLabel = GOAL_LABELS[goalKey] || goalKey.replace(/_/g, ' ');

  const targets = [
    { label: 'Calories', value: profile?.daily_calorie_target || 2100, unit: 'kcal', color: '#111827' },
    { label: 'Protein', value: profile?.daily_protein_g || 150, unit: 'g', color: macroColors.protein },
    { label: 'Carbs', value: profile?.daily_carbs_g || 200, unit: 'g', color: macroColors.carbs },
    { label: 'Fat', value: profile?.daily_fat_g || 70, unit: 'g', color: macroColors.fat },
    { label: 'Fibre', value: profile?.daily_fibre_g || 30, unit: 'g', color: macroColors.fibre },
  ];

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={brand.primary} />}
    >
      {/* Profile header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <View style={styles.goalBadge}>
          <Text style={styles.goalText}>🎯 {goalLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push('/edit-profile' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{stats.totalRecipes}</Text>
          <Text style={styles.statLabel}>Recipes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{stats.totalCooked}</Text>
          <Text style={styles.statLabel}>Cooked</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{stats.streak} 🔥</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      {/* Daily Targets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Targets</Text>
        <View style={styles.targetsCard}>
          {targets.map((t, i) => (
            <View key={i} style={[styles.targetRow, i === targets.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.targetDot, { backgroundColor: t.color }]} />
              <Text style={styles.targetLabel}>{t.label}</Text>
              <Text style={[styles.targetValue, { color: t.color }]}>
                {t.value.toLocaleString()} {t.unit}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
              activeOpacity={0.6}
              onPress={() => item.route ? router.push(item.route as any) : null}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <Text style={styles.menuEmoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.6}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>HealthyEating v1.0.0</Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  // Profile card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  goalBadge: {
    backgroundColor: brand.primaryBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  goalText: { fontSize: 13, fontWeight: '600', color: brand.primary },
  editBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },

  // Stats
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },

  // Section
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Targets
  targetsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    gap: 10,
  },
  targetDot: { width: 8, height: 8, borderRadius: 4 },
  targetLabel: { flex: 1, fontSize: 14, color: '#374151' },
  targetValue: { fontSize: 14, fontWeight: '600' },

  // Menu
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuEmoji: { fontSize: 16 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  menuArrow: { fontSize: 20, color: '#D1D5DB' },

  // Sign out
  signOutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },

  version: { textAlign: 'center', fontSize: 12, color: '#D1D5DB', marginTop: 12 },
});
