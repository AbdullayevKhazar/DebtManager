import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  createDebtor,
  deleteDebtorById,
  getAllDebtors,
} from "@/backend/debtorRepository";
import { configureGoogleSignIn } from "@/backend/driveService";
import { checkBackupStatus } from "@/backend/driveScheduler";
import { formatAzn } from "@/backend/money";
import type { ToastNotice } from "@/components/shared/Toast";
import type { Debtor } from "@/types";

export function useHome() {
  const db = useSQLiteContext();
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const nextNoticeId = useRef(0);

  const clearNotice = useCallback(() => setNotice(null), []);
  const showNotice = useCallback(
    (message: string, action: ToastNotice["action"], title?: string) => {
      setNotice({ id: ++nextNoticeId.current, action, message, title });
    },
    [],
  );

  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [isSavingDebtor, setIsSavingDebtor] = useState(false);
  const isSavingDebtorRef = useRef(false);

  const [showBalance, setShowBalance] = useState(true);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [debtorToDelete, setDebtorToDelete] = useState<Debtor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoadError(false);
      const result = await getAllDebtors(db);
      setDebtors(result);
    } catch (error) {
      console.error("Dashboard load error:", error);
      setLoadError(true);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    let backupTimer: ReturnType<typeof setTimeout> | undefined;

    const initializeDashboard = async () => {
      try {
        await configureGoogleSignIn();
        const savedPrivacy = await AsyncStorage.getItem("show_balance");
        if (!cancelled && savedPrivacy !== null) {
          setShowBalance(savedPrivacy === "true");
        }

        if (Constants.executionEnvironment !== "storeClient") {
          const Notifications = await import("expo-notifications");
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== "granted") {
            console.log("Bildiriş icazəsi verilmədi");
          }
        }
      } catch (error) {
        console.error("Dashboard initialization error:", error);
      } finally {
        if (!cancelled) {
          backupTimer = setTimeout(async () => {
            try {
              const status = await checkBackupStatus();
              if (!cancelled && status.needsBackup) {
                showNotice(
                  "Yedəkləmə vaxtıdır. Tənzimləmələrdən yedək yaradın.",
                  "warning",
                  "Yedəkləmə xatırlatması",
                );
              }
            } catch (error) {
              console.error("Backup status error:", error);
            }
          }, 3000);
        }
      }
    };

    void initializeDashboard();
    return () => {
      cancelled = true;
      if (backupTimer) clearTimeout(backupTimer);
    };
  }, [showNotice]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const totalBalance = useMemo(
    () => debtors.reduce((sum, debtor) => sum + (debtor.balance ?? 0), 0),
    [debtors],
  );

  const locations = useMemo(
    () => [
      ...new Set(
        debtors
          .map((debtor) => debtor.location?.trim())
          .filter((location): location is string => Boolean(location)),
      ),
    ],
    [debtors],
  );

  const filteredDebtors = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return debtors.filter((debtor) => {
      const matchesSearch =
        debtor.name.toLowerCase().includes(normalizedQuery) ||
        Boolean(debtor.phone?.includes(searchQuery));
      const matchesLocation = selectedLocation
        ? debtor.location?.trim() === selectedLocation
        : true;
      return matchesSearch && matchesLocation;
    });
  }, [debtors, searchQuery, selectedLocation]);

  const formatMoney = useCallback(
    (amount: number) => (showBalance ? formatAzn(amount) : "••••"),
    [showBalance],
  );

  const toggleBalanceVisibility = useCallback(async () => {
    const nextState = !showBalance;
    setShowBalance(nextState);
    try {
      await AsyncStorage.setItem("show_balance", String(nextState));
    } catch (error) {
      console.error("Balance visibility save error:", error);
      setShowBalance(!nextState);
      showNotice("Balans görünüşünü yadda saxlamaq mümkün olmadı.", "error");
    }
  }, [showBalance, showNotice]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadData();
  }, [loadData]);

  const handleDelete = useCallback((debtor: Debtor) => {
    setDebtorToDelete(debtor);
    setDeleteDialogVisible(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (isDeleting) return;
    setDeleteDialogVisible(false);
    setDebtorToDelete(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!debtorToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteDebtorById(db, debtorToDelete.id);
      setDeleteDialogVisible(false);
      setDebtorToDelete(null);
      await loadData();
      showNotice("Borclu silindi.", "success");
    } catch (error) {
      console.error("Debtor delete error:", error);
      showNotice("Borclunu silmək mümkün olmadı.", "error");
    } finally {
      setIsDeleting(false);
    }
  }, [db, debtorToDelete, isDeleting, loadData, showNotice]);

  const handleSaveDebtor = useCallback(
    async (name: string, phone: string, location: string): Promise<boolean> => {
      const cleanName = name.trim();
      const cleanPhone = phone.trim();
      const cleanLocation = location.trim();

      if (!cleanName) {
        showNotice("Ad daxil edin.", "warning");
        return false;
      }
      if (isSavingDebtorRef.current) return false;

      isSavingDebtorRef.current = true;
      setIsSavingDebtor(true);
      try {
        await createDebtor(db, cleanName, cleanPhone, cleanLocation, 1);
        setAddSheetVisible(false);
        await loadData();
        showNotice(
          `${cleanName} borclular siyahısına əlavə olundu.`,
          "success",
          "Borclu əlavə edildi",
        );
        return true;
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "DUPLICATE_PHONE") {
          showNotice("Bu nömrə artıq mövcuddur.", "warning");
        } else {
          console.error("Create debtor error:", error);
          showNotice("Yadda saxlamaq mümkün olmadı.", "error");
        }
        return false;
      } finally {
        isSavingDebtorRef.current = false;
        setIsSavingDebtor(false);
      }
    },
    [db, loadData, showNotice],
  );

  const handleDismissAddSheet = useCallback(() => {
    if (isSavingDebtorRef.current) return;
    Keyboard.dismiss();
    setAddSheetVisible(false);
  }, []);

  const hasActiveFilters = Boolean(searchQuery || selectedLocation);
  const handleEmptyAction = useCallback(() => {
    if (hasActiveFilters) {
      setSearchQuery("");
      setSelectedLocation(null);
    } else {
      setAddSheetVisible(true);
    }
  }, [hasActiveFilters]);

  return {
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
    notice,
    clearNotice,
    showNotice,
    deleteDialogVisible,
    debtorToDelete,
    isDeleting,
    formatMoney,
    loadData,
    toggleBalanceVisibility,
    handleRefresh,
    handleDelete,
    closeDeleteDialog,
    confirmDelete,
    handleSaveDebtor,
    handleDismissAddSheet,
    hasActiveFilters,
    handleEmptyAction,
  };
}
