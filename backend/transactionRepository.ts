import { SQLiteDatabase } from "expo-sqlite";
import { Transaction } from "../types";
import { isValidQepik } from "./money";

export const getTransactionsByDebtor = async (
  db: SQLiteDatabase,
  debtorId: number,
): Promise<Transaction[]> =>
  db.getAllAsync<Transaction>(
    `SELECT *
     FROM transactions
     WHERE debtor_id = ?
     ORDER BY created_at DESC, id DESC`,
    [debtorId],
  );

export const addTransaction = async (
  db: SQLiteDatabase,
  debtorId: number,
  type: "debt" | "payment",
  amount: number,
  note: string,
  date = Date.now(),
) => {
  if (!isValidQepik(amount) || amount === 0) {
    throw new Error(
      "Transaction amount must be a positive integer qepik value.",
    );
  }

  return db.runAsync(
    `INSERT INTO transactions (debtor_id, type, amount, note, date, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [debtorId, type, amount, note, date, Date.now()],
  );
};

export const deleteTransaction = async (db: SQLiteDatabase, id: number) =>
  db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);

export const getTransactionsForReport = async (
  db: SQLiteDatabase,
  filter: "month" | "year" | "all",
): Promise<(Transaction & { debtor_name: string })[]> => {
  let dateQuery = "";
  let params: number[] = [];
  const now = new Date();

  if (filter === "month") {
    dateQuery = "WHERE t.date >= ?";
    params = [new Date(now.getFullYear(), now.getMonth(), 1).getTime()];
  } else if (filter === "year") {
    dateQuery = "WHERE t.date >= ?";
    params = [new Date(now.getFullYear(), 0, 1).getTime()];
  }

  return db.getAllAsync<Transaction & { debtor_name: string }>(
    `SELECT t.*, d.name AS debtor_name
     FROM transactions t
     JOIN debtors d ON t.debtor_id = d.id
     ${dateQuery}
     ORDER BY t.date DESC`,
    params,
  );
};

export const getGeneralReport = async (db: SQLiteDatabase) => {
  const result = await db.getAllAsync<{
    type: "debt" | "payment";
    total: number;
  }>("SELECT type, SUM(amount) AS total FROM transactions GROUP BY type");
  const totalGiven = result.find((row) => row.type === "debt")?.total ?? 0;
  const totalReceived =
    result.find((row) => row.type === "payment")?.total ?? 0;

  return {
    totalGiven,
    totalReceived,
    currentPending: totalGiven - totalReceived,
  };
};
