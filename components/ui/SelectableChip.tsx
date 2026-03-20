import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { brand } from '@/constants/Colors';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function SelectableChip({ label, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  chipSelected: {
    backgroundColor: brand.primaryBg,
    borderColor: brand.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  labelSelected: {
    color: brand.primary,
    fontWeight: '600',
  },
});
