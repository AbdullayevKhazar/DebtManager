import * as LocalAuthentication from "expo-local-authentication";
import { Alert } from "react-native";

export const authenticateUser = async () => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        "Məlumat",
        "Biometrik sistem tapılmadı, girişə icazə verilir.",
      );
      return true;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Giriş üçün təsdiqləyin",
      fallbackLabel: "Şifrə istifadə et",
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.error("Biometrik xəta:", error);
    return false;
  }
};
