import React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Switch } from "@/components/ui/switch";
import { Text as UIText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import Toast from "@/components/shared/Toast";
import { useSettings } from "@/hooks/useSetting";

function formatBackupDate(value?: string): string {
  if (!value) return "Tarix məlum deyil";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarix məlum deyil";
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const primaryColor = useCSSVariable("--color-primary") as string | undefined;
  const appVersion = Constants.expoConfig?.version ?? "—";

  const {
    biometricsEnabled,
    isBiometricSupported,
    isCheckingBiometrics,
    isUpdatingBiometrics,
    toggleBiometrics,
    busyAction,
    isBusy,
    status,
    handleBackup,
    handleRestoreClick,
    dialogMode,
    driveFiles,
    selectedFile,
    closeDialog,
    selectBackupFile,
    backToFileList,
    handleRestore,
    notice,
    clearNotice,
  } = useSettings();

  return (
    <VStack className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 18) + 24,
        }}
      >
        <VStack className="gap-5 px-4 pt-3">
          <HStack className="items-center gap-3 pb-1">
            <Heading size="xl" className="text-foreground">
              Tənzimləmələr
            </Heading>
          </HStack>

          <VStack className="gap-2">
            <Heading size="sm" className="px-1 text-foreground">
              Təhlükəsizlik
            </Heading>
            <HStack className="items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-100">
                <Ionicons
                  name="finger-print-outline"
                  size={23}
                  color={primaryColor || "#6366f1"}
                />
              </View>
              <VStack className="min-w-0 flex-1 gap-1">
                <UIText className="font-semibold text-foreground">
                  Biometrik giriş
                </UIText>
                <UIText className="text-xs text-muted-foreground">
                  {isCheckingBiometrics
                    ? "Yoxlanılır..."
                    : isBiometricSupported
                      ? "Barmaq izi / Face ID"
                      : "Bu cihazda əlçatan deyil"}
                </UIText>
              </VStack>
              {isCheckingBiometrics || isUpdatingBiometrics ? (
                <ActivityIndicator color={primaryColor || "#6366f1"} />
              ) : (
                <Switch
                  value={biometricsEnabled}
                  onValueChange={(value: boolean) =>
                    void toggleBiometrics(value)
                  }
                  isDisabled={!isBiometricSupported || isBusy}
                  accessibilityLabel="Biometrik girişi aktivləşdir"
                />
              )}
            </HStack>
          </VStack>

          <VStack className="gap-2">
            <Heading size="sm" className="px-1 text-foreground">
              Google Drive
            </Heading>
            <VStack className="gap-4 rounded-2xl border border-border bg-card p-4">
              <HStack className="items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-info-100">
                  <Ionicons name="cloud-outline" size={23} color="#2563eb" />
                </View>
                <VStack className="flex-1">
                  <UIText className="font-semibold text-foreground">
                    Yedəkləmə və bərpa
                  </UIText>
                  <UIText className="text-xs text-muted-foreground">
                    Google hesabınızda saxlayın
                  </UIText>
                </VStack>
              </HStack>
              <HStack className="gap-3">
                <Button
                  className="flex-1 rounded-xl"
                  isDisabled={isBusy || isUpdatingBiometrics}
                  onPress={() => void handleBackup()}
                >
                  {busyAction === "backup" ? (
                    <ButtonSpinner />
                  ) : (
                    <Ionicons
                      name="cloud-upload-outline"
                      size={18}
                      color="#ffffff"
                    />
                  )}
                  <ButtonText>
                    {busyAction === "backup" ? "Yedəklənir" : "Yedəklə"}
                  </ButtonText>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  isDisabled={isBusy || isUpdatingBiometrics}
                  onPress={() => void handleRestoreClick()}
                >
                  {busyAction === "list" || busyAction === "restore" ? (
                    <ButtonSpinner />
                  ) : (
                    <Ionicons
                      name="cloud-download-outline"
                      size={18}
                      color={primaryColor || "#64748b"}
                    />
                  )}
                  <ButtonText>
                    {busyAction === "list" ? "Axtarılır" : "Bərpa et"}
                  </ButtonText>
                </Button>
              </HStack>
              {isBusy && status ? (
                <HStack className="items-center gap-2 rounded-xl bg-secondary p-3">
                  <ActivityIndicator
                    size="small"
                    color={primaryColor || "#64748b"}
                  />
                  <UIText className="min-w-0 flex-1 text-xs text-muted-foreground">
                    {status}
                  </UIText>
                </HStack>
              ) : null}
            </VStack>
          </VStack>

          <UIText className="pt-3 text-center text-xs text-muted-foreground">
            Borc və Hesabat · v{appVersion}
          </UIText>
        </VStack>
      </ScrollView>

      <AlertDialog
        isOpen={dialogMode !== null}
        onClose={closeDialog}
        closeOnOverlayClick={!isBusy}
        isKeyboardDismissable={!isBusy}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="w-[92%] max-w-md rounded-2xl border border-border bg-background">
          {dialogMode === "choose" ? (
            <>
              <AlertDialogHeader>
                <Heading size="lg" className="text-foreground">
                  Yedək seçin
                </Heading>
              </AlertDialogHeader>
              <AlertDialogBody>
                <ScrollView
                  className="max-h-80"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  <VStack className="gap-2 py-2">
                    {driveFiles.map((file) => (
                      <Pressable
                        key={file.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${file.name} faylını seç`}
                        onPress={() => selectBackupFile(file)}
                        className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={22}
                          color={primaryColor || "#6366f1"}
                        />
                        <VStack className="min-w-0 flex-1 gap-1">
                          <UIText
                            className="font-semibold text-foreground"
                            numberOfLines={2}
                          >
                            {file.name}
                          </UIText>
                          <UIText className="text-xs text-muted-foreground">
                            {formatBackupDate(file.createdTime)}
                          </UIText>
                        </VStack>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#94a3b8"
                        />
                      </Pressable>
                    ))}
                  </VStack>
                </ScrollView>
              </AlertDialogBody>
              <AlertDialogFooter className="mt-3 flex-row justify-end">
                <Button variant="outline" onPress={closeDialog}>
                  <ButtonText>Bağla</ButtonText>
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <Heading size="lg" className="text-foreground">
                  Bərpanı təsdiqlə
                </Heading>
              </AlertDialogHeader>
              <AlertDialogBody>
                <VStack className="gap-3">
                  <UIText
                    className="font-semibold text-foreground"
                    numberOfLines={2}
                  >
                    {selectedFile?.name ?? ""}
                  </UIText>
                  <UIText className="text-sm text-muted-foreground">
                    Məlumatlar bazaya birləşdiriləcək. Əvvəlcə yedək almaq
                    tövsiyə olunur.
                  </UIText>
                  {busyAction === "restore" && status ? (
                    <HStack className="items-center gap-2">
                      <ActivityIndicator
                        size="small"
                        color={primaryColor || "#64748b"}
                      />
                      <UIText className="min-w-0 flex-1 text-xs text-muted-foreground">
                        {status}
                      </UIText>
                    </HStack>
                  ) : null}
                </VStack>
              </AlertDialogBody>
              <AlertDialogFooter className="mt-4 flex-row justify-end gap-3">
                <Button
                  variant="outline"
                  isDisabled={isBusy}
                  onPress={backToFileList}
                >
                  <ButtonText>Geri</ButtonText>
                </Button>
                <Button
                  isDisabled={isBusy || !selectedFile}
                  onPress={() => void handleRestore()}
                >
                  {busyAction === "restore" ? <ButtonSpinner /> : null}
                  <ButtonText>
                    {busyAction === "restore" ? "Bərpa edilir" : "Bərpa et"}
                  </ButtonText>
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <Toast notice={notice} onClose={clearNotice} duration={3000} />
    </VStack>
  );
}
