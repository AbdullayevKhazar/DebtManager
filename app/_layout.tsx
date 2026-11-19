import "@/global.css";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaListener,
  SafeAreaProvider,
} from "react-native-safe-area-context";

import { Uniwind, useCSSVariable, useUniwind } from "uniwind";

// Gluestack UI
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Box } from "@/components/ui/box";
// import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
// import { Text } from "@/components/ui/text";

// Custom components
import { ThemeSwitcher } from "@/components/custom/ThemeSwitcher";
import { authenticateUser } from "@/backend/biometricAuthentication";
import { LICENSE_ACTIVATION_CACHE_KEY } from "@/backend/entitlementKeys";
import { migrateDbIfNeeded } from "@/backend/migrations";
// import LicenseScreen from "@/components/shared/LicenseScreen";

// Backend and services

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

// -----------------------------------------------------------------------------
// Navigation Theme
// -----------------------------------------------------------------------------

function ThemedNavigation() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const systemColorScheme = useColorScheme();

  const isDark =
    theme === "dark" || (hasAdaptiveThemes && systemColorScheme === "dark");

  const [background, card, text, border, primary] = useCSSVariable([
    "--color-background",
    "--color-card",
    "--color-foreground",
    "--color-border",
    "--color-primary",
  ]) as (string | undefined)[];

  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        dark: isDark,
        colors: {
          ...base.colors,
          background: background ?? base.colors.background,
          card: card ?? base.colors.card,
          text: text ?? base.colors.text,
          border: border ?? base.colors.border,
          primary: primary ?? base.colors.primary,
        },
      }}
    >
      <React.Suspense
        fallback={
          <Box className="flex-1 items-center justify-center bg-background">
            <Spinner size="large" />
          </Box>
        }
      >
        <SQLiteProvider
          databaseName="debtmanager.db"
          onInit={migrateDbIfNeeded}
          useSuspense
        >
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: {
                backgroundColor: background ?? base.colors.background,
              },
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                animation: "none",
              }}
            />

            <Stack.Screen
              name="debtors/[id]"
              options={{
                headerShown: false,
                animation: "slide_from_right",
                gestureEnabled: true,
              }}
            />
          </Stack>
        </SQLiteProvider>
      </React.Suspense>
    </ThemeProvider>
  );
}

// function LockedScreen({ onRetry }: { onRetry: () => void }) {
//   return (
//     <Box className="flex-1 items-center justify-center bg-background p-5">
//       <Heading className="mb-2 text-xl font-bold text-destructive">
//         Giriş edilmədi 🔒
//       </Heading>

//       <Text className="mb-5 text-sm text-muted-foreground">
//         Davam etmək üçün təsdiqləyin
//       </Text>

//       <Button onPress={onRetry} className="rounded-xl px-6 py-3">
//         <ButtonText className="font-semibold">Təkrar yoxla</ButtonText>
//       </Button>
//     </Box>
//   );
// }

// -----------------------------------------------------------------------------
// App Content
// -----------------------------------------------------------------------------

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  // const [hasLicense, setHasLicense] = useState(false);
  // const [isUnlocked, setIsUnlocked] = useState(false);

  const checkBiometrics = async () => {
    setIsLoading(true);

    try {
      const bioEnabled = await AsyncStorage.getItem("settings_biometrics");

      if (bioEnabled !== "true") {
        // setIsUnlocked(true);
        return;
      }

      const success = await authenticateUser();

      if (success) {
        // setIsUnlocked(true);
      }
    } catch (error) {
      console.error("Biometric Authentication Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkInitialState = async () => {
    try {
      const savedLicense = await AsyncStorage.getItem(
        LICENSE_ACTIVATION_CACHE_KEY,
      );

      if (savedLicense === "true") {
        // setHasLicense(true);
        await checkBiometrics();
      } else {
        // setHasLicense(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Initialization Error:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void checkInitialState();
  }, []);

  const handleLicenseSuccess = async () => {
    await AsyncStorage.setItem(LICENSE_ACTIVATION_CACHE_KEY, "true");

    // setHasLicense(true);
    // setIsUnlocked(true);
  };

  if (isLoading) {
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <Spinner size="large" />
      </Box>
    );
  }

  // if (!hasLicense) {
  //   return <LicenseScreen onUnlock={handleLicenseSuccess} />;
  // }

  // if (!isUnlocked) {
  //   return <LockedScreen onRetry={checkBiometrics} />;
  // }

  return <ThemedNavigation />;
}

// -----------------------------------------------------------------------------
// Root Layout Navigation
// -----------------------------------------------------------------------------

function RootLayoutNav() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const systemColorScheme = useColorScheme();

  const isDark =
    theme === "dark" || (hasAdaptiveThemes && systemColorScheme === "dark");

  return (
    <SafeAreaListener
      onChange={({ insets }) => {
        Uniwind.updateInsets(insets);
      }}
    >
      <KeyboardProvider>
        <StatusBar style={isDark ? "light" : "dark"} />

        <AppContent />

        <ThemeSwitcher />
      </KeyboardProvider>
    </SafeAreaListener>
  );
}

// -----------------------------------------------------------------------------
// Root Layout
// -----------------------------------------------------------------------------

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GluestackUIProvider mode="system">
          <RootLayoutNav />
        </GluestackUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
