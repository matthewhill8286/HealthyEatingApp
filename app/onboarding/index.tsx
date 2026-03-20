import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingButton } from '@/components/ui/OnboardingButton';
import { brand } from '@/constants/Colors';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.hero}>
        <Text style={styles.emoji}>🥗</Text>
        <Text style={styles.title}>Welcome to{'\n'}HealthyEating</Text>
        <Text style={styles.subtitle}>
          Let's personalise your experience so your AI coach can suggest meals tailored to your
          body, goals, and taste.
        </Text>
      </View>

      <View style={styles.features}>
        <FeatureRow emoji="🧠" text="AI-powered meal suggestions" />
        <FeatureRow emoji="📊" text="Track protein, fibre, fats & more" />
        <FeatureRow emoji="📋" text="Weekly meal plans & shopping lists" />
        <FeatureRow emoji="🍳" text="Discover new recipes daily" />
      </View>

      <View style={styles.bottom}>
        <OnboardingButton label="Let's go" onPress={() => router.push('/onboarding/step-diet')} />
      </View>
    </View>
  );
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: brand.primaryDark,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  features: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  bottom: {
    gap: 8,
  },
});
