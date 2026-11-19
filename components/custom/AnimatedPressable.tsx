import { HapticKind, triggerHaptic } from "@/motion/haptic";
import { motion } from "@/motion/motion";
import React, { useCallback, useEffect } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";


const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AnimatedPressableProps = Omit<PressableProps, "style"> & {
  /** Animasiya edilən Pressable-in adi React Native style-ı. */
  style?: StyleProp<ViewStyle>;
  /** Basarkən ölçü. Məsələn, 0.97 = 3% kiçilmə. */
  pressedScale?: number;
  /** Haptic yalnız uğurlu onPress zamanı işə düşür. */
  haptic?: HapticKind;
};

/**
 * Təkrar istifadə olunan toxunma animasiyası.
 * - onPressIn: sürətli, yüngül sıxılma
 * - onPressOut: yumşaq spring ilə öz ölçüsünə qayıdış
 * - Reduced Motion: animasiya söndürülür
 */
export function AnimatedPressable({
  onPress,
  onPressIn,
  onPressOut,
  disabled = false,
  haptic = "none",
  pressedScale = motion.scale.pressable,
  style,
  children,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (disabled) scale.value = 1;
  }, [disabled, scale]);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      if (!disabled) {
        scale.value = reducedMotion
          ? 1
          : withTiming(pressedScale, { duration: motion.duration.pressIn });
      }
      onPressIn?.(event);
    },
    [disabled, onPressIn, pressedScale, reducedMotion, scale],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = reducedMotion
        ? 1
        : withSpring(1, {
            damping: motion.spring.damping,
            stiffness: motion.spring.stiffness,
            mass: motion.spring.mass,
            overshootClamping: motion.spring.overshootClamping,
          });
      onPressOut?.(event);
    },
    [onPressOut, reducedMotion, scale],
  );

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) return;
      triggerHaptic(haptic);
      onPress?.(event);
    },
    [disabled, haptic, onPress],
  );

  return (
    <ReanimatedPressable
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </ReanimatedPressable>
  );
}
