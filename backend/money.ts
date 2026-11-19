export const QEPik_PER_AZN = 100;

export type Qepik = number;

export const isValidQepik = (value: unknown): value is Qepik =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export const aznToQepik = (amount: number | string): Qepik | null => {
  const normalized =
    typeof amount === "string" ? amount.trim().replace(",", ".") : amount;
  const parsed =
    typeof normalized === "number" ? normalized : Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) return null;

  const qepik = Math.round((parsed + Number.EPSILON) * QEPik_PER_AZN);
  return Number.isSafeInteger(qepik) ? qepik : null;
};

export const qepikToAzn = (qepik: Qepik): number => qepik / QEPik_PER_AZN;

export const formatAzn = (qepik: Qepik): string =>
  `${qepikToAzn(qepik).toLocaleString("az-AZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₼`;
