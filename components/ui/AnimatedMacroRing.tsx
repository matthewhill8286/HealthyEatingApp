/**
 * AnimatedMacroRing — animated circular progress ring using Reanimated.
 *
 * Renders a proper circular arc that smoothly animates from 0 to the target
 * percentage on mount and when values change. Uses a series of arc segments
 * built from rotated half-circle masks (no SVG dependency).
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

type Props = {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color: string;
  size?: number;
  thickness?: number;
  delay?: number;
  textColor?: string;
  subtextColor?: string;
};

export function AnimatedMacroRing({
  label,
  value,
  target,
  unit = 'g',
  color,
  size = 68,
  thickness = 5,
  delay = 0,
  textColor = '#111827',
  subtextColor,
}: Props) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const displayPct = Math.round(pct * 100);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [pct, delay]);

  const halfSize = size / 2;
  const innerSize = size - thickness * 2;

  // Arc segment that fills based on progress
  // We use 4 quadrant-based clips to simulate a circular progress
  const makeQuadrantStyle = (quadrant: 0 | 1 | 2 | 3) => {
    return useAnimatedStyle(() => {
      // Each quadrant covers 25% of the circle
      const quadrantStart = quadrant * 0.25;
      const quadrantEnd = (quadrant + 1) * 0.25;
      const segmentProgress = interpolate(
        progress.value,
        [quadrantStart, quadrantEnd],
        [0, 1],
        'clamp'
      );

      // Rotation: quadrant 0 = top-right, 1 = bottom-right, 2 = bottom-left, 3 = top-left
      const baseRotation = quadrant * 90;
      const rotation = baseRotation + segmentProgress * 90 - 90;

      return {
        opacity: progress.value > quadrantStart ? 1 : 0,
        transform: [{ rotate: `${rotation}deg` }],
      };
    });
  };

  const q0Style = makeQuadrantStyle(0);
  const q1Style = makeQuadrantStyle(1);
  const q2Style = makeQuadrantStyle(2);
  const q3Style = makeQuadrantStyle(3);

  return (
    <View style={styles.container}>
      <View style={[styles.ring, { width: size, height: size, borderRadius: halfSize }]}>
        {/* Track */}
        <View
          style={[
            styles.track,
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: thickness,
              borderColor: color + '20',
            },
          ]}
        />

        {/* Progress arcs — 4 quadrant masks */}
        {[q0Style, q1Style, q2Style, q3Style].map((animStyle, i) => (
          <Animated.View
            key={i}
            style={[
              styles.quadrant,
              {
                width: halfSize,
                height: halfSize,
                top: i < 2 ? 0 : halfSize,
                left: i === 0 || i === 3 ? halfSize : 0,
                transformOrigin:
                  i === 0 ? `0px ${halfSize}px` :
                  i === 1 ? `${halfSize}px ${halfSize}px` :
                  i === 2 ? `${halfSize}px 0px` :
                  `0px 0px`,
              },
              animStyle,
            ]}
          >
            <View
              style={[
                styles.arcSegment,
                {
                  width: size,
                  height: size,
                  borderRadius: halfSize,
                  borderWidth: thickness,
                  borderColor: color,
                  top: i < 2 ? 0 : -halfSize,
                  left: i === 0 || i === 3 ? -halfSize : 0,
                },
              ]}
            />
          </Animated.View>
        ))}

        {/* Inner circle (white fill) + text */}
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <Text style={[styles.pct, { color, fontSize: size * 0.22 }]}>{displayPct}%</Text>
        </View>
      </View>

      <Text style={[styles.label, subtextColor ? { color: subtextColor } : null]}>{label}</Text>
      <Text style={[styles.detail, subtextColor ? { color: subtextColor } : null]}>
        {Math.round(value)}{unit} / {target}{unit}
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
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  track: {
    position: 'absolute',
  },
  quadrant: {
    position: 'absolute',
    overflow: 'hidden',
  },
  arcSegment: {
    position: 'absolute',
  },
  inner: {
    position: 'absolute',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
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
