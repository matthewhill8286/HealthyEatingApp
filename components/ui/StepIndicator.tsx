import React from 'react';
import { View, StyleSheet } from 'react-native';
import { brand } from '@/constants/Colors';

type Props = {
  total: number;
  current: number;
};

export function StepIndicator({ total, current }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current && styles.dotDone,
            i === current && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotDone: {
    backgroundColor: brand.primaryLight,
  },
  dotActive: {
    width: 24,
    backgroundColor: brand.primary,
  },
});
