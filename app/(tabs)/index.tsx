import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  type ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { useRouter } from "expo-router";

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text as UIText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import Toast from "@/components/shared/Toast";

import { DebtorRow } from "@/components/custom/home/DebtorRow";
import {
  AddDebtorSheet,
  DashboardHeader,
} from "@/components/custom/home/DashboardHeader";
import { useHome } from "@/hooks/useHome";
import type { Debtor } from "@/types";
import { AnimatedFab } from "@/components/custom/AnimatedFab";

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const primaryColor = useCSSVariable("--color-primary") as string | undefined;

  const {
    debtors,
    filteredDebtors,
    totalBalance,
    locations,
    isRefreshing,
    isInitialLoading,
    loadError,
    searchQuery,
    setSearchQuery,
    selectedLocation,
    setSelectedLocation,
    addSheetVisible,
    setAddSheetVisible,
    isSavingDebtor,
    showBalance,
    toggleBalanceVisibility,
    deleteDialogVisible,
    debtorToDelete,
    isDeleting,
    formatMoney,
    handleRefresh,
    handleDelete,
    closeDeleteDialog,
    confirmDelete,
    handleSaveDebtor,
    handleDismissAddSheet,
    hasActiveFilters,
    handleEmptyAction,
    notice,
    clearNotice,
    showNotice,
  } = useHome();

  const renderItem: ListRenderItem<Debtor> = useCallback(
    ({ item }) => (
      <DebtorRow
        debtor={item}
        formatMoney={formatMoney}
        onDelete={handleDelete}
        onPress={(debtor) =>
          router.push({
            pathname: "/debtors/[id]",
            params: {
              id: String(debtor.id),
              name: debtor.name,
            },
          })
        }
      />
    ),
    [formatMoney, handleDelete, router],
  );

  const listEmpty = (
    <VStack className="items-center justify-center gap-3 px-6 py-12">
      <Heading size="lg" className="text-center text-foreground">
        {loadError
          ? "Məlumatlar yüklənmədi"
          : hasActiveFilters
            ? "Nəticə tapılmadı"
            : "Hələ borclu yoxdur"}
      </Heading>
      <UIText size="sm" className="text-center text-muted-foreground">
        {loadError
          ? "Yenidən cəhd edin."
          : hasActiveFilters
            ? "Axtarışı və ya filtri dəyişin."
            : "İlk borclunu əlavə edərək başlayın."}
      </UIText>
      <Button onPress={loadError ? handleRefresh : handleEmptyAction}>
        <ButtonText>
          {loadError
            ? "Yenidən cəhd et"
            : hasActiveFilters
              ? "Filtrləri təmizlə"
              : "Borclu əlavə et"}
        </ButtonText>
      </Button>
    </VStack>
  );

  return (
    <VStack className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {isInitialLoading ? (
        <VStack className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={primaryColor} />
        </VStack>
      ) : (
        <>
          <FlatList
            className="flex-1"
            data={filteredDebtors}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            ListHeaderComponent={
              <DashboardHeader
                debtorCount={debtors.length}
                formatMoney={formatMoney}
                locations={locations}
                onLocationChange={setSelectedLocation}
                onOpenReports={() => router.push("/reports")}
                onOpenSettings={() => router.push("/settings")}
                onSearchChange={setSearchQuery}
                onToggleBalance={toggleBalanceVisibility}
                searchQuery={searchQuery}
                selectedLocation={selectedLocation}
                showBalance={showBalance}
                totalBalance={totalBalance}
              />
            }
            ListEmptyComponent={listEmpty}
            ListFooterComponent={
              <VStack style={{ height: insets.bottom + 104 }} />
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={primaryColor}
              />
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {!addSheetVisible && (
            <AnimatedFab
              onPress={() => setAddSheetVisible(true)}
              accessibilityLabel="Yeni borclu əlavə et"
            />
          )}

          {addSheetVisible && (
            <AddDebtorSheet
              visible={addSheetVisible}
              isSaving={isSavingDebtor}
              locations={locations}
              onDismiss={handleDismissAddSheet}
              onSave={handleSaveDebtor}
              onNotify={showNotice}
            />
          )}

          {/* Silmə təsdiqi qalır: Toast təsdiq düymələrini əvəz etmir. */}
          <AlertDialog
            isOpen={deleteDialogVisible}
            onClose={closeDeleteDialog}
            closeOnOverlayClick={!isDeleting}
            isKeyboardDismissable={!isDeleting}
          >
            <AlertDialogBackdrop />
            <AlertDialogContent className="w-[90%] max-w-md rounded-2xl border border-border bg-background">
              <AlertDialogHeader>
                <Heading size="lg" className="text-foreground">
                  Borclunu sil
                </Heading>
              </AlertDialogHeader>
              <AlertDialogBody>
                <UIText size="sm" className="text-muted-foreground">
                  {debtorToDelete
                    ? `${debtorToDelete.name} silinsin? Bu əməliyyat geri qaytarıla bilməz.`
                    : "Bu əməliyyat geri qaytarıla bilməz."}
                </UIText>
              </AlertDialogBody>
              <AlertDialogFooter className="mt-4 flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  isDisabled={isDeleting}
                  onPress={closeDeleteDialog}
                >
                  <ButtonText>Ləğv et</ButtonText>
                </Button>
                <Button
                  variant="destructive"
                  isDisabled={isDeleting || !debtorToDelete}
                  onPress={() => void confirmDelete()}
                >
                  {isDeleting && <ButtonSpinner />}
                  <ButtonText>Sil</ButtonText>
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Məlumat, xəta, uğur və yedəkləmə xatırlatması: Custom Toast. */}
      <Toast notice={notice} onClose={clearNotice} duration={3000} />
    </VStack>
  );
}
