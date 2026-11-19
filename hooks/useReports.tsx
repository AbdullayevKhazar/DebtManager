import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { getTransactionsForReport } from "@/backend/transactionRepository";
import type { Transaction } from "@/types";

export type ReportRange = "month" | "year" | "all";
export type ReportTransaction = Transaction & { debtor_name: string };

export type ReportNotice = {
  id: number;
  message: string;
  action: "success" | "error" | "warning" | "info";
  title?: string;
};

export type ReportTotals = {
  borrowed: number;
  repaid: number;
  net: number;
  debts: number;
  payments: number;
};

function getPeriodEnd(range: ReportRange): number | null {
  if (range === "all") return null;
  const now = new Date();
  // Cari hesabatlara bu gündən sonra tarixlənən əməliyyatları daxil etmirik.
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).getTime();
  const nextPeriod =
    range === "month"
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
      : new Date(now.getFullYear() + 1, 0, 1).getTime();
  return Math.min(tomorrow, nextPeriod);
}

function getPeriodCaption(range: ReportRange): string {
  const now = new Date();
  if (range === "month") {
    return new Intl.DateTimeFormat("az-AZ", {
      month: "long",
      year: "numeric",
    }).format(now);
  }
  if (range === "year") return `${now.getFullYear()}-cı il`;
  return "Bütün əməliyyatlar";
}

/** Hesabat ekranının məlumat, filtr, hesablama və bildiriş məntiqi. */
export function useReport() {
  const db = useSQLiteContext();
  const [range, setRange] = useState<ReportRange>("month");
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState<ReportNotice | null>(null);

  // Gec cavab verən sorğu yeni filtrin məlumatlarını əvəz etməsin.
  const requestIdRef = useRef(0);
  const noticeIdRef = useRef(0);
  const clearNotice = useCallback(() => setNotice(null), []);

  const showNotice = useCallback(
    (message: string, action: ReportNotice["action"]) => {
      setNotice({ id: ++noticeIdRef.current, message, action });
    },
    [],
  );

  const loadReport = useCallback(
    async (refresh = false) => {
      const requestId = ++requestIdRef.current;
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setIsRefreshing(false);
        setLoadError(false);
      }

      try {
        const result = await getTransactionsForReport(db, range);
        if (requestId !== requestIdRef.current) return;

        // Repository başlanğıc tarixini yoxlayır; burada sabahdan
        // etibarən gələcək tarixli qeydləri cari dövr hesabından çıxarırıq.
        const periodEnd = getPeriodEnd(range);
        const filtered =
          periodEnd === null
            ? result
            : result.filter((entry) => Number(entry.date) < periodEnd);

        setTransactions(filtered);
        setLoadError(false);
        if (refresh) showNotice("Hesabat yeniləndi.", "success");
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        console.error("Report load error:", error);
        if (refresh) {
          // Əvvəlki məlumatları itirmədən yeniləmə xətasını bildir.
          showNotice(
            "Yeniləmək mümkün olmadı. Əvvəlki məlumatlar göstərilir.",
            "error",
          );
        } else {
          setTransactions([]);
          setLoadError(true);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [db, range, showNotice],
  );

  // Tab/səhifəyə qayıdanda yenilənir; filtr dəyişəndə köhnə sorğu ləğv edilir.
  useFocusEffect(
    useCallback(() => {
      void loadReport();
      return () => {
        requestIdRef.current += 1;
      };
    }, [loadReport]),
  );

  const refreshReport = useCallback(() => {
    void loadReport(true);
  }, [loadReport]);

  const summary = useMemo<ReportTotals>(() => {
    let borrowed = 0;
    let repaid = 0;
    let debts = 0;
    let payments = 0;
    for (const transaction of transactions) {
      if (transaction.type === "debt") {
        borrowed += transaction.amount;
        debts += 1;
      } else if (transaction.type === "payment") {
        repaid += transaction.amount;
        payments += 1;
      }
    }
    return { borrowed, repaid, net: borrowed - repaid, debts, payments };
  }, [transactions]);

  // Ən son əlavə olunan qeydlər yuxarıda: ID monoton artan SQLite ID-dir.
  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.id - a.id).slice(0, 10),
    [transactions],
  );

  const maxVolume = Math.max(summary.borrowed, summary.repaid);
  const netIsPositive = summary.net > 0;
  const netIsNegative = summary.net < 0;
  const netColor = netIsPositive
    ? "text-error-600"
    : netIsNegative
      ? "text-info-600"
      : "text-foreground";
  const netStatus =
    range === "all"
      ? netIsPositive
        ? "Ödənilməli borc"
        : netIsNegative
          ? "Artıq ödəniş"
          : "Balans bağlanıb"
      : netIsPositive
        ? "Bu dövrdə borc daha çoxdur"
        : netIsNegative
          ? "Bu dövrdə ödəniş daha çoxdur"
          : "Borc və ödəniş bərabərdir";
  const netDescription =
    range === "all"
      ? "Bütün dövrlər üzrə borc və ödənişlərin xalis fərqi."
      : "Yalnız seçilən dövrdə verilən borc və alınan ödənişlərin fərqi; ümumi borc qalığı deyil.";

  const periodCaption = getPeriodCaption(range);

  return {
    range,
    setRange,
    periodCaption,
    transactions,
    recentTransactions,
    isLoading,
    isRefreshing,
    loadError,
    summary,
    maxVolume,
    netIsPositive,
    netIsNegative,
    netColor,
    netStatus,
    netDescription,
    loadReport,
    refreshReport,
    notice,
    clearNotice,
  };
}
