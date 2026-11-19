import { SQLiteDatabase } from "expo-sqlite";
import { Debtor } from "../types";

export const getAllDebtors = async (db: SQLiteDatabase): Promise<Debtor[]> => {
  return await db.getAllAsync<Debtor>(`
    SELECT 
      d.*,
      COALESCE(SUM(CASE WHEN t.type = 'debt' THEN t.amount ELSE -t.amount END), 0) as balance,
      MAX(CASE WHEN t.type = 'payment' THEN t.date ELSE NULL END) as last_payment_date
    FROM debtors d
    LEFT JOIN transactions t ON d.id = t.debtor_id
    GROUP BY d.id
    ORDER BY d.name ASC;
  `);
};

export const deleteDebtorById = async (db: SQLiteDatabase, id: number) => {
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM debtors WHERE id = ?", [id]);
  });
};

export const createDebtor = async (
  db: SQLiteDatabase,
  name: string,
  phone: string,
  location: string,
  type: number,
) => {
  const cleanName = name.trim();
  const cleanPhone = phone.replace(/\D/g, "");
  const cleanLocation = location.trim();

  // Telefon daxil edilibsə, təkrar yoxlaması apar.
  if (cleanPhone.length > 0) {
    const existingDebtor = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM debtors WHERE phone = ? LIMIT 1",
      [cleanPhone],
    );

    if (existingDebtor) {
      throw new Error("DUPLICATE_PHONE");
    }
  }

  const result = await db.runAsync(
    `INSERT INTO debtors
      (name, phone, location, created_at, type)
     VALUES (?, ?, ?, ?, ?)`,
    [cleanName, cleanPhone, cleanLocation, Date.now(), type],
  );

  return result.lastInsertRowId;
};
