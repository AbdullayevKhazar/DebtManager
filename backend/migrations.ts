import { SQLiteDatabase } from "expo-sqlite";

const DATABASE_VERSION = 8;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA foreign_keys = ON;");

  let { user_version: currentVersion } =
    (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version")) ?? {
      user_version: 0,
    };

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS debtors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        location TEXT,
        type INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debtor_id INTEGER NOT NULL,
        type TEXT CHECK(type IN ('debt', 'payment')) NOT NULL,
        amount INTEGER NOT NULL,
        note TEXT,
        date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (debtor_id) REFERENCES debtors (id) ON DELETE CASCADE
      );
    `);
    currentVersion = DATABASE_VERSION;
  }

  if (currentVersion > 0 && currentVersion < 2) {
    await db.execAsync("ALTER TABLE debtors ADD COLUMN location TEXT;");
    currentVersion = 2;
  }

  if (currentVersion > 0 && currentVersion < 3) {
    await db.execAsync("ALTER TABLE debtors ADD COLUMN type INTEGER DEFAULT 0;");
    currentVersion = 3;
  }

  // Versions 3-7 stored AZN as SQLite REAL. Rebuild only the transactions
  // table inside one SQL transaction and preserve every row id and date.
  if (currentVersion > 0 && currentVersion < DATABASE_VERSION) {
    try {
      await db.execAsync(`
        PRAGMA foreign_keys = OFF;
        BEGIN IMMEDIATE;
        ALTER TABLE transactions RENAME TO transactions_legacy;
        CREATE TABLE transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          debtor_id INTEGER NOT NULL,
          type TEXT CHECK(type IN ('debt', 'payment')) NOT NULL,
          amount INTEGER NOT NULL,
          note TEXT,
          date INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (debtor_id) REFERENCES debtors (id) ON DELETE CASCADE
        );
        INSERT INTO transactions (id, debtor_id, type, amount, note, date, created_at)
        SELECT id, debtor_id, type, CAST(ROUND(amount * 100) AS INTEGER), note, date, created_at
        FROM transactions_legacy;
        DROP TABLE transactions_legacy;
        PRAGMA user_version = ${DATABASE_VERSION};
        COMMIT;
        PRAGMA foreign_keys = ON;
      `);
    } catch (error) {
      try {
        await db.execAsync("ROLLBACK;");
      } catch {
        // The failed statement may have occurred before a transaction began.
      } finally {
        await db.execAsync("PRAGMA foreign_keys = ON;");
      }
      throw error;
    }
    currentVersion = DATABASE_VERSION;
  }

  if (currentVersion === DATABASE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}; PRAGMA foreign_keys = ON;`);
  }
}
