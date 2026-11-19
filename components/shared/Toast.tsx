import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastAction = "success" | "error" | "warning" | "info";

export type ToastNotice = {
  id: number;
  message: string;
  action: ToastAction;
  title?: string;
};

type Props = {
  notice: ToastNotice | null;
  onClose: () => void;
  duration?: number;
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const variants: Record<
  ToastAction,
  { icon: IconName; title: string; color: string; iconBg: string }
> = {
  success: {
    icon: "checkmark-circle",
    title: "Uğurlu əməliyyat",
    color: "#16A34A",
    iconBg: "#DCFCE7",
  },
  error: {
    icon: "alert-circle",
    title: "Xəta baş verdi",
    color: "#E11D48",
    iconBg: "#FFE4E6",
  },
  warning: {
    icon: "warning",
    title: "Diqqət",
    color: "#D97706",
    iconBg: "#FEF3C7",
  },
  info: {
    icon: "information-circle",
    title: "Məlumat",
    color: "#2563EB",
    iconBg: "#DBEAFE",
  },
};

/** Əlavə toast kitabxanası olmadan işləyən React Native bildirişi. */
export default function Toast({ notice, onClose, duration = 3000 }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const translateY = useRef(new Animated.Value(-55)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Parent hər renderdə yeni callback versə belə animasiyanı yenidən başlatma.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const dismiss = useCallback(() => {
    if (!notice || closingRef.current) return;
    closingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -35,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onCloseRef.current();
    });
  }, [notice?.id, opacity, translateY]);

  useEffect(() => {
    if (!notice) return;
    closingRef.current = false;
    translateY.setValue(-55);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 16,
        stiffness: 210,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [notice?.id, duration, dismiss, opacity, translateY]);

  if (!notice) return null;

  const variant = variants[notice.action] ?? variants.info;
  const bg = isDark ? "#151B2B" : "#FFFFFF";
  const border = isDark ? "#323C51" : "#E8EDF4";
  const primaryText = isDark ? "#F8FAFC" : "#0F172A";
  const secondaryText = isDark ? "#B2BCD0" : "#64748B";

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        {/* Modal aktiv olduqda kənara toxunmaq bildirişi bağlayır. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityLabel="Bildirişi bağla"
        />
        <Animated.View
          accessibilityRole="alert"
          style={[
            styles.toast,
            {
              marginTop: insets.top + 12,
              backgroundColor: bg,
              borderColor: border,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: variant.iconBg }]}>
            <Ionicons name={variant.icon} color={variant.color} size={25} />
          </View>

          <View style={styles.body}>
            <Text
              style={[styles.title, { color: primaryText }]}
              numberOfLines={1}
            >
              {notice.title ?? variant.title}
            </Text>
            <Text
              style={[styles.message, { color: secondaryText }]}
              numberOfLines={3}
            >
              {notice.message}
            </Text>
          </View>

          <Pressable
            onPress={dismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Bildirişi bağla"
            style={styles.closeButton}
          >
            <Ionicons name="close" size={18} color={secondaryText} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
  },
  toast: {
    width: "100%",
    minHeight: 82,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingRight: 13,
    paddingLeft: 19,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 12,
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  iconWrap: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  message: { fontSize: 13, lineHeight: 19 },
  closeButton: {
    width: 30,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});
