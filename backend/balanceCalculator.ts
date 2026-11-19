import { Transaction } from "../types";

export const calculateBalance = (transactions: Transaction[]): number =>
  transactions.reduce(
    (total, transaction) =>
      transaction.type === "debt"
        ? total + transaction.amount
        : total - transaction.amount,
    0,
  );

export const getFinancialSummary = (transactions: Transaction[]) => {
  const totalBorrowed = transactions
    .filter((t) => t.type === "debt")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRepaid = transactions
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalBorrowed,
    totalRepaid,
    currentBalance: totalBorrowed - totalRepaid,
  };
};
