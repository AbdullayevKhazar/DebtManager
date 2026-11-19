import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  View,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetDragIndicator,
  BottomSheetPortal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@/components/ui/bottomsheet";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import Toast from "@/components/shared/Toast";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text as UIText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { formatAzn } from "@/backend/money";
import type { Transaction } from "@/types";
import { useDebtor } from "@/hooks/useDebtor";

const formatDate = (timestamp: number | string) => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "Tarix məlum deyil"
    : new Intl.DateTimeFormat("az-AZ", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <VStack className="gap-2">
      <UIText className="text-sm font-medium text-foreground">{label}</UIText>
      <BottomSheetTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={
          multiline
            ? "min-h-24 rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
            : "h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground"
        }
      />
    </VStack>
  );
}

export default function DebtorDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const primaryColor = useCSSVariable("--color-primary") as string | undefined;
  const sheetRef = useRef<React.ElementRef<typeof BottomSheet>>(null);

  const {
    debtor,
    transactions,
    isLoading,
    isRefreshing,
    loadError,
    balance,
    totals,
    initials,
    sheetMode,
    setSheetMode,
    entryAmount,
    setEntryAmount,
    entryNote,
    setEntryNote,
    entryDate,
    setEntryDate,
    editName,
    setEditName,
    editPhone,
    setEditPhone,
    editLocation,
    setEditLocation,
    isBusy,
    notice,
    clearNotice,
    transactionToDelete,
    isDeleting,
    closeDeleteDialog,
    deleteSelectedTransaction,
    loadData,
    handleRefresh,
    openEntry,
    closeSheet,
    saveEntry,
    openEdit,
    saveDebtor,
    confirmDelete,
    openWhatsApp,
  } = useDebtor();

  // BottomSheet-in açılması UI səviyyəsində idarə olunur.
  // Bağlananda sheetMode=null olur və komponent tam unmount edilir.
  useEffect(() => {
    if (sheetMode !== null) sheetRef.current?.open(0);
  }, [sheetMode]);

  const renderItem: ListRenderItem<Transaction> = ({ item }) => {
    const isDebt = item.type === "debt";
    return (
      <HStack className="mx-4 mb-2 items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <View
          className={`h-11 w-11 items-center justify-center rounded-xl ${isDebt ? "bg-error-100" : "bg-success-100"}`}
        >
          <Ionicons
            name={isDebt ? "arrow-up" : "arrow-down"}
            size={20}
            color={isDebt ? "#dc2626" : "#16a34a"}
          />
        </View>
        <VStack className="min-w-0 flex-1" space="xs">
          <UIText className="font-semibold text-foreground" numberOfLines={2}>
            {item.note || (isDebt ? "Borc" : "Ödəniş")}
          </UIText>
          <UIText size="xs" className="text-muted-foreground">
            {isDebt ? "Borc" : "Ödəniş"} · {formatDate(item.date)}
          </UIText>
        </VStack>
        <VStack className="items-end gap-1">
          <UIText
            className={`font-bold ${isDebt ? "text-error-600" : "text-success-600"}`}
          >
            {isDebt ? "+" : "−"}
            {formatAzn(item.amount)}
          </UIText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Əməliyyatı sil"
            onPress={() => confirmDelete(item)}
            className="rounded-lg p-1"
          >
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
          </Pressable>
        </VStack>
      </HStack>
    );
  };

  const header = (
    <VStack className="gap-4 px-4 pb-5 pt-3">
      <HStack className="items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri qayıt"
          onPress={() => router.back()}
          className="rounded-xl border border-border bg-card p-3"
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={primaryColor || "#64748b"}
          />
        </Pressable>
        <Heading size="md" className="text-foreground">
          Borclu məlumatları
        </Heading>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Redaktə et"
          disabled={!debtor}
          onPress={openEdit}
          className="rounded-xl border border-border bg-card p-3"
        >
          <Ionicons
            name="create-outline"
            size={20}
            color={primaryColor || "#64748b"}
          />
        </Pressable>
      </HStack>

      {debtor && !loadError ? (
        <>
          <VStack className="gap-4 rounded-2xl border border-border bg-card p-5">
            <HStack className="items-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                <UIText className="text-xl font-bold text-primary-700">
                  {initials}
                </UIText>
              </View>
              <VStack className="min-w-0 flex-1" space="xs">
                <Heading
                  size="lg"
                  className="text-foreground"
                  numberOfLines={2}
                >
                  {debtor.name}
                </Heading>
                <UIText className="text-muted-foreground">
                  Borclu profili
                </UIText>
              </VStack>
            </HStack>
            <HStack className="items-center gap-3">
              <Ionicons name="call-outline" size={20} color="#64748b" />
              <UIText className="flex-1 text-foreground">
                {debtor.phone || "Telefon qeyd edilməyib"}
              </UIText>
            </HStack>
            <HStack className="items-center gap-3">
              <Ionicons name="location-outline" size={20} color="#64748b" />
              <UIText className="flex-1 text-foreground">
                {debtor.location || "Ünvan qeyd edilməyib"}
              </UIText>
            </HStack>
            <Button
              variant="outline"
              className="rounded-xl"
              onPress={() => void openWhatsApp()}
              isDisabled={!debtor.phone}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
              <ButtonText>WhatsApp ilə əlaqə</ButtonText>
            </Button>
          </VStack>

          <VStack className="gap-2 rounded-2xl border border-border bg-card p-5">
            <UIText className="text-muted-foreground">Cari balans</UIText>
            <Heading
              size="3xl"
              className={
                balance > 0
                  ? "text-error-600"
                  : balance < 0
                    ? "text-info-600"
                    : "text-foreground"
              }
            >
              {formatAzn(balance)}
            </Heading>
            <UIText className="text-muted-foreground">
              {balance > 0
                ? "Ödənilməli borc"
                : balance < 0
                  ? "Artıq ödəniş"
                  : "Balans bağlanıb"}
            </UIText>
          </VStack>

          <HStack className="gap-3">
            <Button
              className="flex-1 rounded-xl"
              variant="destructive"
              onPress={() => openEntry("debt")}
            >
              <ButtonText>+ Borc yaz</ButtonText>
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onPress={() => openEntry("payment")}
            >
              <ButtonText>Ödəniş al</ButtonText>
            </Button>
          </HStack>

          <VStack space="xs" className="pt-2">
            <Heading size="lg" className="text-foreground">
              Əməliyyat tarixçəsi
            </Heading>
            <UIText className="text-muted-foreground">
              {transactions.length} əməliyyat · {totals.debts} borc ·{" "}
              {totals.payments} ödəniş
            </UIText>
          </VStack>
        </>
      ) : null}
    </VStack>
  );

  return (
    <VStack className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      {isLoading ? (
        <VStack className="flex-1 items-center justify-center" space="md">
          <ActivityIndicator size="large" color={primaryColor} />
          <UIText className="text-muted-foreground">
            Məlumatlar yüklənir...
          </UIText>
        </VStack>
      ) : (
        <FlatList
          data={loadError ? [] : transactions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <VStack className="items-center gap-3 px-8 py-12">
              <Ionicons
                name={loadError ? "alert-circle-outline" : "receipt-outline"}
                size={36}
                color="#94a3b8"
              />
              <Heading size="md" className="text-center text-foreground">
                {loadError
                  ? "Borclu tapılmadı və ya məlumatlar yüklənmədi"
                  : "Hələ əməliyyat yoxdur"}
              </Heading>
              <UIText className="text-center text-muted-foreground">
                {loadError
                  ? "Yenidən cəhd edin."
                  : "İlk borc və ya ödəniş əməliyyatını əlavə edin."}
              </UIText>
              <Button
                variant="outline"
                onPress={() =>
                  loadError ? void loadData() : openEntry("debt")
                }
              >
                <ButtonText>
                  {loadError ? "Yenidən yoxla" : "Borc yaz"}
                </ButtonText>
              </Button>
            </VStack>
          }
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 16) + 20,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sheet yalnız aktiv forma olduqda yaradılır. */}
      {sheetMode !== null && (
        <BottomSheet
          ref={sheetRef}
          defaultSnapIndex={0}
          onClose={() => setSheetMode(null)}
        >
          <BottomSheetPortal
            snapPoints={["88%"]}
            backdropComponent={BottomSheetBackdrop}
            handleComponent={BottomSheetDragIndicator}
            enablePanDownToClose={!isBusy}
            closeOnBackdropPress={!isBusy}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            backgroundClassName="bg-background"
            handleIndicatorClassName="bg-muted-foreground"
          >
            <BottomSheetScrollView
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="gap-4 px-5 pt-3 pb-28"
            >
              <HStack className="items-start justify-between gap-3 pb-2">
                <VStack className="min-w-0 flex-1 gap-1">
                  <Heading size="xl" className="text-foreground">
                    {sheetMode === "edit"
                      ? "Borclunu redaktə et"
                      : sheetMode === "debt"
                        ? "Borc yaz"
                        : "Ödəniş al"}
                  </Heading>
                  <UIText size="sm" className="text-muted-foreground">
                    {sheetMode === "edit"
                      ? "Borclunun əlaqə məlumatlarını yeniləyin."
                      : "Məbləği, tarixi və qeydi daxil edin."}
                  </UIText>
                </VStack>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Formu bağla"
                  hitSlop={12}
                  disabled={isBusy}
                  onPress={closeSheet}
                  className="h-11 w-11 items-center justify-center rounded-xl bg-secondary"
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={primaryColor ?? "#525252"}
                  />
                </Pressable>
              </HStack>

              {sheetMode === "edit" ? (
                <>
                  <Field
                    label="Ad və soyad"
                    value={editName}
                    onChangeText={(value) => {
                      setEditName(value);
                    }}
                  />
                  <Field
                    label="Telefon"
                    value={editPhone}
                    onChangeText={(value) => {
                      setEditPhone(value);
                    }}
                    keyboardType="phone-pad"
                  />
                  <Field
                    label="Ünvan"
                    value={editLocation}
                    onChangeText={(value) => {
                      setEditLocation(value);
                    }}
                    multiline
                  />
                </>
              ) : (
                <>
                  <Field
                    label="Məbləğ (AZN)"
                    placeholder="Məsələn: 25,50"
                    value={entryAmount}
                    onChangeText={(value) => {
                      setEntryAmount(value);
                    }}
                    keyboardType="decimal-pad"
                  />
                  <Field
                    label="Tarix (YYYY-MM-DD)"
                    placeholder="YYYY-MM-DD"
                    value={entryDate}
                    onChangeText={(value) => {
                      setEntryDate(value);
                    }}
                  />
                  <Field
                    label="Qeyd"
                    placeholder="Əməliyyat haqqında qeyd"
                    value={entryNote}
                    onChangeText={(value) => {
                      setEntryNote(value);
                    }}
                    multiline
                  />
                </>
              )}

              <HStack className="mt-22 gap-3 pb-5">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  isDisabled={isBusy}
                  onPress={closeSheet}
                >
                  <ButtonText>Ləğv et</ButtonText>
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  isDisabled={isBusy || sheetMode === null}
                  onPress={() => {
                    if (sheetMode === "edit") void saveDebtor();
                    else void saveEntry();
                  }}
                >
                  {isBusy ? <ButtonSpinner /> : null}
                  <ButtonText>
                    {isBusy ? "Yadda saxlanılır..." : "Yadda saxla"}
                  </ButtonText>
                </Button>
              </HStack>
            </BottomSheetScrollView>
          </BottomSheetPortal>
        </BottomSheet>
      )}

      <AlertDialog
        isOpen={transactionToDelete !== null}
        onClose={closeDeleteDialog}
        closeOnOverlayClick={!isDeleting}
        isKeyboardDismissable={!isDeleting}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="w-[90%] max-w-md rounded-2xl border border-border bg-background">
          <AlertDialogHeader>
            <Heading size="lg" className="text-foreground">
              Əməliyyatı sil
            </Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <UIText size="sm" className="text-muted-foreground">
              Bu əməliyyat silinsin? Bu addım geri qaytarıla bilməz.
            </UIText>
          </AlertDialogBody>
          <AlertDialogFooter className="mt-4 flex-row justify-end gap-3">
            <Button
              variant="outline"
              isDisabled={isDeleting}
              onPress={closeDeleteDialog}
            >
              <ButtonText>Ləğv et</ButtonText>
            </Button>
            <Button
              variant="destructive"
              isDisabled={isDeleting || !transactionToDelete}
              onPress={() => void deleteSelectedTransaction()}
            >
              {isDeleting ? <ButtonSpinner /> : null}
              <ButtonText>Sil</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toast notice={notice} onClose={clearNotice} duration={3000} />
    </VStack>
  );
}
