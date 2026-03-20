/**
 * FadeIn — wraps children in an animated fade+slide entrance.
 *
 * Usage:
 *   <FadeIn delay={100}>
 *     <Card>...</Card>
 *   </FadeIn>
 */
import React from 'react';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn as ReanimatedFadeIn,
} from 'react-native-reanimated';

type Direction = 'up' | 'down' | 'none';

type Props = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: Direction;
  distance?: number;
  style?: any;
};

export function FadeIn({
  children,
  delay = 0,
  duration = 400,
  direction = 'up',
  distance = 12,
  style,
}: Props) {
  const entering =
    direction === 'up'
      ? FadeInDown.delay(delay).duration(duration).springify().damping(18)
      : direction === 'down'
      ? FadeInUp.delay(delay).duration(duration).springify().damping(18)
      : ReanimatedFadeIn.delay(delay).duration(duration);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
