import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brand } from '@/constants/Colors';

type Props = {
  message: string;
  label?: string;
};

export function CoachBubble({ message, label = 'Your Coach' }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>🧠</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: brand.primaryBg,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    backgroundColor: brand.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: brand.primary,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
  },
});
