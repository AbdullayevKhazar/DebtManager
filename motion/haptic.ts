import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export type HapticKind =
  | "none"
  | "selection"
  | "light"
  | "medium"
  | "success"
  | "warning"
  | "error";

/**
 * UI əməliyyatları haptic-dən asılı olmamalıdır: effekt uğursuz olsa,
 * düymənin əsas onPress funksiyası yenə işləməlidir.
 */
export function triggerHaptic(kind: HapticKind = "selection"): void {
  if (kind === "none" || Platform.OS === "web") return;

  let action: Promise<void>;
  switch (kind) {
    case "selection":
      action = Haptics.selectionAsync();
      break;
    case "light":
      action = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "medium":
      action = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "success":
      action = Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      break;
    case "warning":
      action = Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      );
      break;
    case "error":
      action = Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );
      break;
  }

  void action.catch(() => {
    // Simulator / cihaz haptic dəstəkləməyə bilər; UI yenə işləyir.
  });
}
