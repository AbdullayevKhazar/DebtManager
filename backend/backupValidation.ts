import { aznToQepik, isValidQepik } from "./money";

export const CURRENT_BACKUP_VERSION = 6;

export type RestoreMode = "merge";

export type BackupDebtor = {
  id: number;
  name: string;
  phone: string;
  location: string;
  type: number;
  created_at: number;
};

export type BackupTransaction = {
  id: number;
  debtor_id: number;
  type: "debt" | "payment";
  amount: number;
  note: string;
  date: number;
  created_at: number;
};

export type ValidatedBackup = {
  version: number;
  moneyUnit: "qepik";
  debtors: BackupDebtor[];
  transactions: BackupTransaction[];
};

type BackupObject = Record<string, unknown>;

const isObject = (value: unknown): value is BackupObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPositiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const isTimestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const asString = (value: unknown, field: string): string => {
  if (typeof value !== "string") throw new Error(`${field} must be a string.`);
  return value;
};

const asOptionalString = (value: unknown, field: string): string => {
  if (value === undefined || value === null) return "";
  return asString(value, field);
};

const normalizeAmount = (value: unknown, version: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Transaction amount is invalid.");
  }

  if (version >= CURRENT_BACKUP_VERSION) {
    if (!isValidQepik(value))
      throw new Error("Transaction amount must be integer qepik.");
    return value;
  }

  const qepik = aznToQepik(value);
  if (qepik === null) throw new Error("Legacy transaction amount is invalid.");
  return qepik;
};

export const validateAndMigrateBackup = (
  jsonContent: string,
): ValidatedBackup => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }

  if (!isObject(parsed)) throw new Error("Backup payload must be an object.");
  const version = parsed.version;
  if (!isPositiveId(version) || version > CURRENT_BACKUP_VERSION) {
    throw new Error("Backup version is unsupported.");
  }
  if (!Array.isArray(parsed.debtors) || !Array.isArray(parsed.transactions)) {
    throw new Error("Backup must contain debtors and transactions arrays.");
  }

  const debtorIds = new Set<number>();
  const debtors = parsed.debtors.map((item, index): BackupDebtor => {
    if (!isObject(item) || !isPositiveId(item.id) || debtorIds.has(item.id)) {
      throw new Error(
        `Debtor at index ${index} has an invalid or duplicate id.`,
      );
    }
    const name = asString(item.name, `Debtor ${item.id} name`).trim();
    if (!name) throw new Error(`Debtor ${item.id} name is required.`);
    if (!isTimestamp(item.created_at)) {
      throw new Error(`Debtor ${item.id} created_at is invalid.`);
    }
    if (
      item.type !== undefined &&
      (typeof item.type !== "number" ||
        !Number.isSafeInteger(item.type) ||
        item.type < 0)
    ) {
      throw new Error(`Debtor ${item.id} type is invalid.`);
    }
    debtorIds.add(item.id);
    return {
      id: item.id,
      name,
      phone: asOptionalString(item.phone, `Debtor ${item.id} phone`),
      location: asOptionalString(
        item.location ?? item.address,
        `Debtor ${item.id} location`,
      ),
      type: typeof item.type === "number" ? item.type : 0,
      created_at: item.created_at,
    };
  });

  const transactionIds = new Set<number>();
  const transactions = parsed.transactions.map(
    (item, index): BackupTransaction => {
      if (
        !isObject(item) ||
        !isPositiveId(item.id) ||
        transactionIds.has(item.id)
      ) {
        throw new Error(
          `Transaction at index ${index} has an invalid or duplicate id.`,
        );
      }
      const debtorId = item.debtor_id ?? item.debtorId;
      if (!isPositiveId(debtorId) || !debtorIds.has(debtorId)) {
        throw new Error(`Transaction ${item.id} references an unknown debtor.`);
      }
      if (item.type !== "debt" && item.type !== "payment") {
        throw new Error(`Transaction ${item.id} type is invalid.`);
      }
      if (!isTimestamp(item.date) || !isTimestamp(item.created_at)) {
        throw new Error(`Transaction ${item.id} date is invalid.`);
      }
      transactionIds.add(item.id);
      return {
        id: item.id,
        debtor_id: debtorId,
        type: item.type,
        amount: normalizeAmount(item.amount, version),
        note: asOptionalString(item.note, `Transaction ${item.id} note`),
        date: item.date,
        created_at: item.created_at,
      };
    },
  );

  return { version, moneyUnit: "qepik", debtors, transactions };
};
