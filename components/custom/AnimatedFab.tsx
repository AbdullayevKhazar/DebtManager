import React from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { AnimatedPressable } from "./AnimatedPressable";
import { motion } from "@/motion/motion";
import { HapticKind } from "@/motion/haptic";

type AnimatedFabProps = {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  bottomOffset?: number;
  rightOffset?: number;
  haptic?: HapticKind;
};

export function AnimatedFab({
  onPress,
  disabled = false,
  accessibilityLabel = "Yeni borclu əlavə et",
  bottomOffset = motion.fab.bottom,
  rightOffset = motion.fab.right,
  haptic = "light",
}: AnimatedFabProps) {
  const insets = useSafeAreaInsets();
  const primary = useCSSVariable("--color-primary") as string | undefined;
  const foreground = useCSSVariable("--color-primary-foreground") as
    | string
    | undefined;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={8}
      haptic={haptic}
      pressedScale={motion.scale.fab}
      style={[
        styles.fab,
        {
          backgroundColor: primary || "#4F46E5",
          bottom: Math.max(insets.bottom, 12) + bottomOffset,
          right: rightOffset,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons
        name="add"
        size={motion.fab.iconSize}
        color={foreground || "#FFFFFF"}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    zIndex: 20,
    elevation: 7,
    width: motion.fab.size,
    height: motion.fab.size,
    borderRadius: motion.fab.size / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },
});
