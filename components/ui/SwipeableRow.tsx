import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';

const DELETE_BTN_WIDTH = 80;
const SWIPE_THRESHOLD = DELETE_BTN_WIDTH * 0.4;

type Props = {
  onDelete: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Wraps any row component and reveals a red "Delete" button when swiped left.
 * Uses only core RN Animated + PanResponder (no native gesture-handler dep).
 */
export function SwipeableRow({ onDelete, children, style }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      // Only capture horizontal drags
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy * 1.5),

      onPanResponderMove: (_, g) => {
        // Allow leftward drag only (negative), clamped
        const base = isOpen.current ? -DELETE_BTN_WIDTH : 0;
        const next = Math.min(0, Math.max(base + g.dx, -DELETE_BTN_WIDTH - 20));
        translateX.setValue(next);
      },

      onPanResponderRelease: (_, g) => {
        const base = isOpen.current ? -DELETE_BTN_WIDTH : 0;
        const final = base + g.dx;

        if (!isOpen.current && (final < -SWIPE_THRESHOLD || g.vx < -0.5)) {
          // Open
          Animated.spring(translateX, {
            toValue: -DELETE_BTN_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
            speed: 14,
          }).start();
          isOpen.current = true;
        } else if (isOpen.current && (final > -DELETE_BTN_WIDTH + SWIPE_THRESHOLD || g.vx > 0.5)) {
          // Close
          snap(0);
        } else {
          // Snap back to current state
          snap(isOpen.current ? -DELETE_BTN_WIDTH : 0);
        }
      },

      onPanResponderTerminate: () => {
        snap(isOpen.current ? -DELETE_BTN_WIDTH : 0);
      },
    }),
  ).current;

  const snap = (to: number) => {
    Animated.spring(translateX, {
      toValue: to,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
    isOpen.current = to !== 0;
  };

  const handleDelete = () => {
    // Animate off-screen then call onDelete
    Animated.timing(translateX, {
      toValue: -400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDelete());
  };

  return (
    <View style={[styles.container, style]}>
      {/* Delete button behind */}
      <View style={styles.deleteContainer}>
        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.8}
          onPress={handleDelete}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Foreground content */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 14,
    marginBottom: 8,
  },
  deleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BTN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: { fontSize: 18, marginBottom: 2 },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
