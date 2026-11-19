import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text as UIText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import Toast from "@/components/shared/Toast";

import { formatAzn } from "@/backend/money";
import {
  useReport,
  type ReportRange,
  type ReportTransaction,
} from "@/hooks/useReports";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const PERIODS: { value: ReportRange; label: string }[] = [
  { value: "month", label: "Bu ay" },
  { value: "year", label: "Bu il" },
  { value: "all", label: "Bütün dövr" },
];

function formatDate(timestamp: number | string): string {
  const time = typeof timestamp === "number" ? timestamp : Number(timestamp);
  const date = new Date(time);
  if (!Number.isFinite(time) || Number.isNaN(date.getTime())) {
    return "Tarix məlum deyil";
  }
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: IconName;
  tone: "debt" | "payment";
}) {
  const isDebt = tone === "debt";
  return (
    <VStack className="min-w-0 flex-1 gap-3 rounded-2xl border border-border bg-card p-4">
      <HStack className="items-center justify-between gap-2">
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${isDebt ? "bg-error-100" : "bg-success-100"}`}
        >
          <Ionicons
            name={icon}
            size={21}
            color={isDebt ? "#dc2626" : "#16a34a"}
          />
        </View>
        <Ionicons
          name={isDebt ? "trending-up-outline" : "checkmark-done-outline"}
          size={17}
          color={isDebt ? "#dc2626" : "#16a34a"}
        />
      </HStack>
      <VStack className="gap-1">
        <UIText className="text-xs text-muted-foreground">{label}</UIText>
        <UIText
          className="text-lg font-bold text-foreground"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {value}
        </UIText>
      </VStack>
    </VStack>
  );
}

function ComparisonBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: "debt" | "payment";
}) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <VStack className="gap-2">
      <HStack className="items-center justify-between gap-3">
        <UIText className="text-sm font-medium text-foreground">{label}</UIText>
        <UIText className="text-sm font-semibold text-foreground">
          {formatAzn(value)}
        </UIText>
      </HStack>
      <View className="h-3 overflow-hidden rounded-full bg-secondary">
        <View
          className={`h-full rounded-full ${color === "debt" ? "bg-error-500" : "bg-success-500"}`}
          style={{ width: `${percentage}%` as `${number}%` }}
        />
      </View>
    </VStack>
  );
}

function TransactionRow({
  transaction,
  onPress,
  isLast,
}: {
  transaction: ReportTransaction;
  onPress: () => void;
  isLast: boolean;
}) {
  const isDebt = transaction.type === "debt";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${transaction.debtor_name}, ${isDebt ? "borc" : "ödəniş"}, ${formatAzn(transaction.amount)}. Borclunun məlumatlarına keç.`}
      className={`flex-row items-center gap-3 px-4 py-4 active:bg-secondary ${isLast ? "" : "border-b border-border"}`}
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-2xl ${isDebt ? "bg-error-100" : "bg-success-100"}`}
      >
        <UIText
          className={`text-sm font-bold ${isDebt ? "text-error-600" : "text-success-600"}`}
        >
          {getInitials(transaction.debtor_name)}
        </UIText>
      </View>
      <VStack className="min-w-0 flex-1 gap-1">
        <UIText className="font-semibold text-foreground" numberOfLines={1}>
          {transaction.debtor_name}
        </UIText>
        <UIText className="text-xs text-muted-foreground" numberOfLines={1}>
          {isDebt ? "Borc" : "Ödəniş"} · {formatDate(transaction.date)}
        </UIText>
        {Boolean(transaction.note?.trim()) && (
          <UIText className="text-xs text-muted-foreground" numberOfLines={1}>
            {transaction.note}
          </UIText>
        )}
      </VStack>
      <VStack className="max-w-[35%] items-end gap-2">
        <UIText
          className={`font-bold ${isDebt ? "text-error-600" : "text-success-600"}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {isDebt ? "+" : "−"}
          {formatAzn(transaction.amount)}
        </UIText>
        <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
      </VStack>
    </Pressable>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const primaryColor = useCSSVariable("--color-primary") as string | undefined;

  const {
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
  } = useReport();

  return (
    <VStack className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshReport}
            tintColor={primaryColor || "#2563eb"}
          />
        }
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 28,
        }}
      >
        <VStack className="gap-5 px-4 pt-3">
          {/* Başlıq */}
          <HStack className="items-center gap-3">
            <VStack className="min-w-0 flex-1 gap-1">
              <Heading size="xl" className="text-foreground">
                Hesabatlar
              </Heading>
              <UIText className="text-sm text-muted-foreground">
                Maliyyə hərəkətlərinə aydın baxış
              </UIText>
            </VStack>
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-100">
              <Ionicons
                name="stats-chart-outline"
                size={21}
                color={primaryColor || "#2563eb"}
              />
            </View>
          </HStack>

          {/* Dövr seçimi */}
          <VStack className="gap-3 rounded-2xl border border-border bg-card p-4">
            <HStack className="items-center justify-between">
              <UIText className="text-sm font-semibold text-foreground">
                Hesabat dövrü
              </UIText>
              <UIText className="text-xs text-muted-foreground">
                {periodCaption}
              </UIText>
            </HStack>
            <HStack className="gap-2">
              {PERIODS.map((option) => {
                const selected = option.value === range;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setRange(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border px-1 ${selected ? "border-primary-500 bg-primary-100" : "border-border bg-background"}`}
                  >
                    <UIText
                      className={`text-sm font-semibold ${selected ? "text-primary-700" : "text-muted-foreground"}`}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {option.label}
                    </UIText>
                  </Pressable>
                );
              })}
            </HStack>
          </VStack>

          {isLoading ? (
            <VStack className="min-h-72 items-center justify-center gap-3 rounded-2xl border border-border bg-card p-8">
              <ActivityIndicator
                size="large"
                color={primaryColor || "#2563eb"}
              />
              <UIText className="text-sm text-muted-foreground">
                Hesabat hazırlanır...
              </UIText>
            </VStack>
          ) : loadError ? (
            <VStack className="items-center gap-4 rounded-2xl border border-border bg-card px-6 py-10">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-error-100">
                <Ionicons
                  name="cloud-offline-outline"
                  size={28}
                  color="#dc2626"
                />
              </View>
              <Heading size="md" className="text-center text-foreground">
                Hesabat yüklənmədi
              </Heading>
              <UIText className="text-center text-sm text-muted-foreground">
                Məlumatları oxumaq mümkün olmadı. Yenidən yoxlayın.
              </UIText>
              <Button onPress={() => void loadReport()} className="rounded-xl">
                <ButtonText>Yenidən cəhd et</ButtonText>
              </Button>
            </VStack>
          ) : (
            <VStack className="gap-4">
              {/* Xalis göstərici: ay/il üçün dövrün fərqidir */}
              <VStack className="gap-3 rounded-3xl border border-border bg-card p-5">
                <HStack className="items-center justify-between gap-3">
                  <VStack className="min-w-0 flex-1 gap-1">
                    <UIText className="text-sm font-medium text-muted-foreground">
                      {range === "all"
                        ? "Ümumi balans"
                        : "Dövr üzrə xalis fərq"}
                    </UIText>
                    <UIText className="text-xs text-muted-foreground">
                      Verilən borc − alınan ödəniş
                    </UIText>
                  </VStack>
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-100">
                    <Ionicons
                      name={
                        netIsPositive
                          ? "wallet-outline"
                          : netIsNegative
                            ? "trending-down-outline"
                            : "checkmark-circle-outline"
                      }
                      size={24}
                      color={primaryColor || "#2563eb"}
                    />
                  </View>
                </HStack>
                <Heading
                  size="3xl"
                  className={netColor}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatAzn(Math.abs(summary.net))}
                </Heading>
                <HStack className="items-center gap-2">
                  <Ionicons
                    name={
                      netIsPositive
                        ? "alert-circle-outline"
                        : netIsNegative
                          ? "information-circle-outline"
                          : "checkmark-circle-outline"
                    }
                    size={18}
                    color={
                      netIsPositive
                        ? "#dc2626"
                        : netIsNegative
                          ? "#2563eb"
                          : "#16a34a"
                    }
                  />
                  <UIText className={`text-sm font-semibold ${netColor}`}>
                    {netStatus}
                  </UIText>
                </HStack>
                <UIText className="text-xs leading-5 text-muted-foreground">
                  {netDescription}
                </UIText>
              </VStack>

              {/* Əsas göstəricilər */}
              <HStack className="gap-3">
                <MetricCard
                  label="Verilən borc"
                  value={formatAzn(summary.borrowed)}
                  icon="arrow-up-outline"
                  tone="debt"
                />
                <MetricCard
                  label="Alınan ödəniş"
                  value={formatAzn(summary.repaid)}
                  icon="arrow-down-outline"
                  tone="payment"
                />
              </HStack>

              {/* Sadə müqayisə vizualı */}
              <VStack className="gap-4 rounded-2xl border border-border bg-card p-5">
                <HStack className="items-center justify-between gap-2">
                  <Heading size="md" className="text-foreground">
                    Məbləğ müqayisəsi
                  </Heading>
                  <Ionicons
                    name="bar-chart-outline"
                    size={19}
                    color="#94a3b8"
                  />
                </HStack>
                <UIText className="text-xs text-muted-foreground">
                  Hər sütun seçilən dövrdəki ən böyük məbləğə nisbətən
                  göstərilir.
                </UIText>
                <ComparisonBar
                  label="Borc"
                  value={summary.borrowed}
                  max={maxVolume}
                  color="debt"
                />
                <ComparisonBar
                  label="Ödəniş"
                  value={summary.repaid}
                  max={maxVolume}
                  color="payment"
                />
              </VStack>

              {/* Əməliyyat statistikası */}
              <HStack className="items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-100">
                  <Ionicons
                    name="receipt-outline"
                    size={22}
                    color={primaryColor || "#2563eb"}
                  />
                </View>
                <VStack className="min-w-0 flex-1 gap-1">
                  <UIText className="font-semibold text-foreground">
                    Əməliyyat sayı
                  </UIText>
                  <UIText className="text-xs text-muted-foreground">
                    {summary.debts} borc · {summary.payments} ödəniş
                  </UIText>
                </VStack>
                <Heading size="xl" className="text-foreground">
                  {transactions.length}
                </Heading>
              </HStack>

              {/* Əməliyyat siyahısı */}
              <VStack className="gap-3 pt-1">
                <HStack className="items-center justify-between gap-3">
                  <VStack className="min-w-0 flex-1 gap-1">
                    <Heading size="lg" className="text-foreground">
                      Son əməliyyatlar
                    </Heading>
                    <UIText className="text-xs text-muted-foreground">
                      Ən son əlavə olunan qeydlər
                    </UIText>
                  </VStack>
                  {transactions.length > 0 && (
                    <UIText className="text-xs font-medium text-muted-foreground">
                      {Math.min(transactions.length, 10)} /{" "}
                      {transactions.length}
                    </UIText>
                  )}
                </HStack>

                {recentTransactions.length === 0 ? (
                  <VStack className="items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-10">
                    <View className="h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                      <Ionicons
                        name="file-tray-outline"
                        size={26}
                        color="#94a3b8"
                      />
                    </View>
                    <UIText className="text-center font-semibold text-foreground">
                      Bu dövrdə əməliyyat yoxdur
                    </UIText>
                    <UIText className="text-center text-sm text-muted-foreground">
                      Başqa dövr seçin və ya borclu səhifəsindən yeni əməliyyat
                      əlavə edin.
                    </UIText>
                  </VStack>
                ) : (
                  <VStack className="overflow-hidden rounded-2xl border border-border bg-card">
                    {recentTransactions.map((transaction, index) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        isLast={index === recentTransactions.length - 1}
                        onPress={() =>
                          router.push({
                            pathname: "/debtors/[id]",
                            params: { id: String(transaction.debtor_id) },
                          })
                        }
                      />
                    ))}
                  </VStack>
                )}
              </VStack>
            </VStack>
          )}
        </VStack>
      </ScrollView>

      {/* Gluestack Toast deyil: tətbiqin mövcud Custom Toast komponentidir. */}
      <Toast notice={notice} onClose={clearNotice} duration={3000} />
    </VStack>
  );
}
