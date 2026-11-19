import type { SQLiteDatabase } from "expo-sqlite";
import {
  BackupDebtor,
  BackupTransaction,
  CURRENT_BACKUP_VERSION,
  validateAndMigrateBackup,
} from "./backupValidation";

export type RestoreResult = {
  importedDebtors: number;
  importedTransactions: number;
  skippedTransactions: number;
};

export const generateBackupString = async (
  db: SQLiteDatabase,
): Promise<string> => {
  const [debtors, transactions] = await Promise.all([
    db.getAllAsync<BackupDebtor>("SELECT * FROM debtors"),
    db.getAllAsync<BackupTransaction>("SELECT * FROM transactions"),
  ]);

  return JSON.stringify({
    timestamp: new Date().toISOString(),
    version: CURRENT_BACKUP_VERSION,
    moneyUnit: "qepik",
    debtors,
    transactions,
  });
};

const findMatchingDebtor = async (db: SQLiteDatabase, debtor: BackupDebtor) =>
  db.getFirstAsync<{ id: number }>(
    `SELECT id FROM debtors
     WHERE name = ? AND phone = ? AND location = ? AND type = ?
     LIMIT 1`,
    [debtor.name, debtor.phone, debtor.location, debtor.type],
  );

const transactionAlreadyExists = async (
  db: SQLiteDatabase,
  debtorId: number,
  transaction: BackupTransaction,
) =>
  db.getFirstAsync<{ id: number }>(
    `SELECT id FROM transactions
     WHERE debtor_id = ? AND type = ? AND amount = ? AND note = ?
       AND date = ? AND created_at = ?
     LIMIT 1`,
    [
      debtorId,
      transaction.type,
      transaction.amount,
      transaction.note,
      transaction.date,
      transaction.created_at,
    ],
  );

/**
 * Restores a validated backup by merging only. Existing rows are never
 * overwritten, so this operation is non-destructive and safe to retry.
 */
export const restoreFromBackupString = async (
  db: SQLiteDatabase,
  jsonContent: string,
): Promise<RestoreResult> => {
  const backup = validateAndMigrateBackup(jsonContent);
  const debtorIdMap = new Map<number, number>();
  let importedDebtors = 0;
  let importedTransactions = 0;
  let skippedTransactions = 0;

  await db.withTransactionAsync(async () => {
    for (const debtor of backup.debtors) {
      const existing = await findMatchingDebtor(db, debtor);
      if (existing) {
        debtorIdMap.set(debtor.id, existing.id);
        continue;
      }

      const result = await db.runAsync(
        `INSERT INTO debtors (name, phone, location, type, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          debtor.name,
          debtor.phone,
          debtor.location,
          debtor.type,
          debtor.created_at,
        ],
      );
      debtorIdMap.set(debtor.id, Number(result.lastInsertRowId));
      importedDebtors += 1;
    }

    for (const transaction of backup.transactions) {
      const localDebtorId = debtorIdMap.get(transaction.debtor_id);
      if (!localDebtorId) throw new Error("Validated debtor mapping is missing.");

      if (await transactionAlreadyExists(db, localDebtorId, transaction)) {
        skippedTransactions += 1;
        continue;
      }

      await db.runAsync(
        `INSERT INTO transactions (debtor_id, type, amount, note, date, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          localDebtorId,
          transaction.type,
          transaction.amount,
          transaction.note,
          transaction.date,
          transaction.created_at,
        ],
      );
      importedTransactions += 1;
    }
  });

  return { importedDebtors, importedTransactions, skippedTransactions };
};

export { validateAndMigrateBackup };
