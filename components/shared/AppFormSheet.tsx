import React, { useCallback, useEffect, useRef } from "react";
import { Keyboard, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCSSVariable } from "uniwind";

import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetDragIndicator,
  BottomSheetFooter,
  BottomSheetPortal,
  BottomSheetScrollView,
} from "@/components/ui/bottomsheet";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text as UIText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type AppFormSheetProps = {
  visible: boolean;
  title: string;
  description?: string;
  isSaving?: boolean;
  onDismiss: () => void;
  onSave: () => void | Promise<void>;
  children: React.ReactNode;
  snapPoints?: Array<string | number>;
  saveLabel?: string;
  cancelLabel?: string;
};

export default function AppFormSheet({
  visible,
  title,
  description,
  isSaving = false,
  onDismiss,
  onSave,
  children,
  snapPoints = ["85%"],
  saveLabel = "Yadda saxla",
  cancelLabel = "Ləğv et",
}: AppFormSheetProps) {
  const sheetRef = useRef<React.ElementRef<typeof BottomSheet>>(null);
  const visibleRef = useRef(visible);
  const savingRef = useRef(isSaving);
  const dismissingRef = useRef(false);
  const foreground = useCSSVariable("--color-foreground") as string | undefined;

  // Keep native onClose callbacks aligned with the latest React state.
  visibleRef.current = visible;
  savingRef.current = isSaving;

  useEffect(() => {
    if (visible) {
      dismissingRef.current = false;
      sheetRef.current?.open(0);
    } else {
      Keyboard.dismiss();
      sheetRef.current?.close();
    }
  }, [visible]);

  const requestDismiss = useCallback(() => {
    if (!visibleRef.current || savingRef.current || dismissingRef.current)
      return;
    dismissingRef.current = true;
    Keyboard.dismiss();
    onDismiss();
    sheetRef.current?.close();
  }, [onDismiss]);

  const handleNativeClose = useCallback(() => {
    if (visibleRef.current && !savingRef.current) requestDismiss();
  }, [requestDismiss]);

  const renderFooter = useCallback(
    (footerProps: React.ComponentProps<typeof BottomSheetFooter>) => (
      <BottomSheetFooter {...footerProps} bottomInset={0}>
        <HStack className="gap-3 border-t border-border bg-background px-5 pb-6 pt-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            isDisabled={isSaving}
            onPress={requestDismiss}
          >
            <ButtonText>{cancelLabel}</ButtonText>
          </Button>
          <Button
            className="flex-1 rounded-xl"
            isDisabled={isSaving}
            onPress={() => void onSave()}
          >
            {isSaving ? <ButtonSpinner /> : null}
            <ButtonText>
              {isSaving ? "Yadda saxlanılır..." : saveLabel}
            </ButtonText>
          </Button>
        </HStack>
      </BottomSheetFooter>
    ),
    [cancelLabel, isSaving, onSave, requestDismiss, saveLabel],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      defaultSnapIndex={0}
      onClose={handleNativeClose}
    >
      <BottomSheetPortal
        snapPoints={snapPoints}
        backdropComponent={BottomSheetBackdrop}
        handleComponent={BottomSheetDragIndicator}
        footerComponent={renderFooter}
        enablePanDownToClose={!isSaving}
        closeOnBackdropPress={!isSaving}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundClassName="bg-background"
        handleIndicatorClassName="bg-muted-foreground"
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-4 px-5 pb-32 pt-4"
        >
          <HStack className="items-start justify-between gap-3 pb-2">
            <VStack className="min-w-0 flex-1 gap-1">
              <Heading size="xl" className="text-foreground">
                {title}
              </Heading>
              {description ? (
                <UIText size="sm" className="text-muted-foreground">
                  {description}
                </UIText>
              ) : null}
            </VStack>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Formu bağla"
              accessibilityState={{ disabled: isSaving }}
              hitSlop={12}
              disabled={isSaving}
              onPress={requestDismiss}
              className="h-11 w-11 items-center justify-center rounded-xl bg-secondary"
            >
              <Ionicons
                name="close"
                size={22}
                color={foreground ?? "#525252"}
              />
            </Pressable>
          </HStack>

          {children}
        </BottomSheetScrollView>
      </BottomSheetPortal>
    </BottomSheet>
  );
}
