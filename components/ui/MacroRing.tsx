import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color: string;
  size?: number;
};

export function MacroRing({ label, value, target, unit = 'g', color, size = 64 }: Props) {
  const pct = Math.min(Math.round((value / target) * 100), 100);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: '#F0F0F0',
          },
        ]}
      >
        {/* Progress arc - simplified as a colored border overlay */}
        <View
          style={[
            styles.ringProgress,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: 'transparent',
              borderTopColor: color,
              borderRightColor: pct > 25 ? color : 'transparent',
              borderBottomColor: pct > 50 ? color : 'transparent',
              borderLeftColor: pct > 75 ? color : 'transparent',
            },
          ]}
        />
        <Text style={[styles.pct, { color, fontSize: size * 0.2 }]}>{pct}%</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detail}>
        {value}{unit} / {target}{unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  ring: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringProgress: {
    position: 'absolute',
    borderWidth: 4,
  },
  pct: {
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  detail: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
