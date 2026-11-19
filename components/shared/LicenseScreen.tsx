import * as Application from "expo-application";
import { get, ref, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import { Alert, Keyboard, Platform } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { db } from "@/backend/firebaseConfig";

// Gluestack UI
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface LicenseScreenProps {
  onUnlock: () => void;
}

interface LicenseData {
  status: "unused" | "active" | "blocked";
  deviceId?: string;
  activatedAt?: string;
}

// -----------------------------------------------------------------------------
// License Screen
// -----------------------------------------------------------------------------

export default function LicenseScreen({ onUnlock }: LicenseScreenProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Device ID
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const getDeviceId = async () => {
      let id: string | null = null;

      if (Platform.OS === "android") {
        id = await Application.getAndroidId();
      } else {
        id = await Application.getIosIdForVendorAsync();
      }

      if (!id) {
        id = "UNKNOWN_DEVICE_ID";
      }

      setDeviceId(id);
    };

    void getDeviceId();
  }, []);

  // ---------------------------------------------------------------------------
  // Verify License
  // ---------------------------------------------------------------------------

  const verifyLicense = async () => {
    Keyboard.dismiss();

    if (!licenseKey.trim()) {
      Alert.alert("Xəta", "Zəhmət olmasa lisenziya kodunu yazın.");
      return;
    }

    setLoading(true);

    const code = licenseKey.trim();

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const licenseRef = ref(db, "licenses/" + code);
      const snapshot = await get(licenseRef);

      if (!snapshot.exists()) {
        Alert.alert("Xəta", "Bu kod yanlışdır.");
        return;
      }

      const data = snapshot.val() as LicenseData;

      if (data.status === "unused") {
        await update(licenseRef, {
          status: "active",
          deviceId: deviceId,
          activatedAt: new Date().toISOString(),
        });

        Alert.alert("Uğurlu", "Lisenziya aktivləşdirildi!");
        onUnlock();
      } else if (data.status === "active") {
        if (data.deviceId === deviceId) {
          onUnlock();
        } else {
          Alert.alert("QADAĞA", "Bu kod başqa cihazda istifadə olunub!");
        }
      } else {
        Alert.alert("Blok", "Bu lisenziya bloklanıb.");
      }
    } catch (error) {
      console.error("License Verification Error:", error);

      Alert.alert("Xəta", "Bağlantı xətası.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Box
        className="flex-1 justify-center bg-background px-6"
        onTouchStart={() => {}}
      >
        {/* Header */}
        <Box className="mb-10 items-center">
          <Heading className="mb-2 text-center text-3xl font-bold text-primary">
            Lisenziya 🔐
          </Heading>

          <Text className="px-5 text-center text-base text-muted-foreground">
            Tətbiqi istifadə etmək üçün satınalma kodunu daxil edin.
          </Text>
        </Box>

        {/* Form */}
        <Box className="mb-10">
          <Text className="mb-2 text-sm font-semibold text-foreground">
            Lisenziya Kodu
          </Text>

          <Input className="h-14 rounded-xl border-outline-300 bg-card">
            <InputField
              placeholder="XXX-XXX-XXX"
              value={licenseKey}
              onChangeText={setLicenseKey}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={verifyLicense}
              className="font-medium tracking-widest"
            />
          </Input>

          <Button
            onPress={verifyLicense}
            isDisabled={loading}
            className="mt-6 h-14 rounded-xl"
            size="lg"
          >
            {loading ? (
              <>
                <Spinner color="white" size="small" />
                <ButtonText>Yoxlanılır...</ButtonText>
              </>
            ) : (
              <ButtonText>Təsdiqlə</ButtonText>
            )}
          </Button>
        </Box>

        {/* Footer */}
        <Box className="absolute bottom-8 left-0 right-0 items-center px-6">
          <Text className="text-xs text-muted-foreground">Device ID:</Text>

          <Text className="mt-1 text-center font-mono text-xs text-foreground">
            {deviceId || "Loading..."}
          </Text>
        </Box>
      </Box>
    </KeyboardAvoidingView>
  );
}
