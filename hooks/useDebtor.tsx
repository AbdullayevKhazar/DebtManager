import { useCallback, useMemo, useRef, useState } from "react";
import { Keyboard, Linking } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { calculateBalance } from "@/backend/balanceCalculator";
import {
  addTransaction,
  deleteTransaction,
  getTransactionsByDebtor,
} from "@/backend/transactionRepository";
import { aznToQepik } from "@/backend/money";
import type { Transaction } from "@/types";

type EntryType = "debt" | "payment";
type SheetMode = EntryType | "edit" | null;

type DebtorDetails = {
  id: number;
  name: string;
  phone: string | null;
  location: string | null;
};

const todayAsInput = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  )
    return null;
  return parsed;
}

function normalizeWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `994${digits.slice(1)}`;
  else if (digits.length === 9) digits = `994${digits}`;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

/** Ekranın məlumat və əməliyyat məntiqi. BottomSheet-in görünüşü səhifədə qalır. */
export function useDebtor() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const debtorId = idParam && /^\d+$/.test(idParam) ? Number(idParam) : NaN;
  const validId = Number.isSafeInteger(debtorId) && debtorId > 0;
  const db = useSQLiteContext();

  const [debtor, setDebtor] = useState<DebtorDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryDate, setEntryDate] = useState(todayAsInput);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const editingRef = useRef(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const isBusy = isSaving || isEditing;

  // Hook yalnız mesaj və təsdiq state-lərini saxlayır.
  // Gluestack UI komponentləri [id].tsx səhifəsində render olunur.
  type Notice = { id: number; message: string; action: "error" | "success" };
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeId = useRef(0);
  const showNotice = (message: string, action: Notice["action"] = "error") => {
    setNotice({ id: ++noticeId.current, message, action });
  };
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deletingRef = useRef(false);

  const clearNotice = useCallback(() => setNotice(null), []);

  const closeSheet = useCallback(() => {
    if (savingRef.current || editingRef.current) return;
    Keyboard.dismiss();
    setSheetMode(null);
  }, []);

  const loadData = useCallback(async () => {
    if (!validId) {
      setLoadError(true);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    try {
      setLoadError(false);
      const [record, entries] = await Promise.all([
        db.getFirstAsync<DebtorDetails>("SELECT * FROM debtors WHERE id = ?", [
          debtorId,
        ]),
        getTransactionsByDebtor(db, debtorId),
      ]);
      setDebtor(record);
      setTransactions(entries);
      if (!record) setLoadError(true);
    } catch (error) {
      console.error("Debtor details load error:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [db, debtorId, validId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const balance = useMemo(() => calculateBalance(transactions), [transactions]);
  const totals = useMemo(
    () => ({
      debts: transactions.filter((entry) => entry.type === "debt").length,
      payments: transactions.filter((entry) => entry.type === "payment").length,
    }),
    [transactions],
  );
  const initials = useMemo(
    () =>
      debtor?.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("") || "?",
    [debtor?.name],
  );

  const openEntry = (type: EntryType) => {
    setEntryAmount("");
    setEntryNote("");
    setEntryDate(todayAsInput());
    setSheetMode(type);
  };

  const saveEntry = async () => {
    if (
      (sheetMode !== "debt" && sheetMode !== "payment") ||
      savingRef.current ||
      !validId
    )
      return;
    const amount = aznToQepik(entryAmount);
    const date = parseLocalDate(entryDate);
    if (amount === null || amount <= 0) {
      showNotice("Sıfırdan böyük düzgün məbləğ daxil edin.");
      return;
    }
    if (!date) {
      showNotice("Tarixi YYYY-MM-DD formatında daxil edin.");
      return;
    }
    Keyboard.dismiss();
    savingRef.current = true;
    setIsSaving(true);
    try {
      await addTransaction(
        db,
        debtorId,
        sheetMode,
        amount,
        entryNote.trim() ||
          (sheetMode === "debt" ? "Borc yazıldı" : "Ödəniş alındı"),
        date.getTime(),
      );
      // Uğurlu yazılışdan sonra Sheet-i bağla, sonra siyahını yenilə.
      setSheetMode(null);
      showNotice("Əməliyyat uğurla əlavə edildi.", "success");
      void loadData();
    } catch (error) {
      console.error("Save transaction error:", error);
      showNotice("Əməliyyat yadda saxlanmadı. Yenidən cəhd edin.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const openEdit = () => {
    if (!debtor) return;
    setEditName(debtor.name);
    setEditPhone(debtor.phone ?? "");
    setEditLocation(debtor.location ?? "");
    setSheetMode("edit");
  };

  const saveDebtor = async () => {
    if (!debtor || editingRef.current) return;
    const name = editName.trim();
    const phone = editPhone.replace(/\s/g, "");
    if (!name) {
      showNotice("Ad və soyad daxil edin.");
      return;
    }
    Keyboard.dismiss();
    editingRef.current = true;
    setIsEditing(true);
    try {
      if (phone) {
        const duplicate = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM debtors WHERE phone = ? AND id != ?",
          [phone, debtorId],
        );
        if (duplicate) {
          showNotice("Bu telefon nömrəsi artıq mövcuddur.");
          return;
        }
      }
      await db.runAsync(
        "UPDATE debtors SET name = ?, phone = ?, location = ? WHERE id = ?",
        [name, phone, editLocation.trim(), debtorId],
      );
      setSheetMode(null);
      showNotice("Borclu məlumatları yeniləndi.", "success");
      void loadData();
    } catch (error) {
      console.error("Update debtor error:", error);
      showNotice("Borclu məlumatları yenilənmədi. Yenidən cəhd edin.");
    } finally {
      editingRef.current = false;
      setIsEditing(false);
    }
  };

  // Silmə üçün təsdiq istəyirik; silmə əməliyyatı ayrıca çağırılır.
  const confirmDelete = (entry: Transaction) => {
    setTransactionToDelete(entry);
  };

  const closeDeleteDialog = () => {
    if (!deletingRef.current) setTransactionToDelete(null);
  };

  const deleteSelectedTransaction = async () => {
    if (!transactionToDelete || deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    try {
      await deleteTransaction(db, transactionToDelete.id);
      setTransactionToDelete(null);
      showNotice("Əməliyyat silindi.", "success");
      await loadData();
    } catch (error) {
      console.error("Delete transaction error:", error);
      setTransactionToDelete(null);
      showNotice("Əməliyyatı silmək mümkün olmadı.");
    } finally {
      deletingRef.current = false;
      setIsDeleting(false);
    }
  };

  const openWhatsApp = async () => {
    const number = debtor?.phone && normalizeWhatsAppNumber(debtor.phone);
    if (!number) {
      showNotice("Düzgün telefon nömrəsi qeyd edilməyib.");
      return;
    }
    try {
      await Linking.openURL(`https://wa.me/${number}`);
    } catch {
      showNotice("WhatsApp açıla bilmədi.");
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadData();
  }, [loadData]);

  return {
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
  };
}
