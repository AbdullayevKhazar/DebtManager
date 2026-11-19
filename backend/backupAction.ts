import { SQLiteDatabase } from "expo-sqlite";
import { Alert } from "react-native";

import { generateBackupString } from "./backupManager";
import { signInWithGoogle, uploadJsonToDrive } from "./driveService";

export const performFullDriveBackup = async (
  db: SQLiteDatabase,
): Promise<boolean> => {
  try {
    console.log("Backup hazırlanır...");
    const jsonString = await generateBackupString(db);

    console.log("Google Token alınır...");
    const accessToken = await signInWithGoogle();

    if (!accessToken) {
      console.log("Token alınmadı.");
      return false;
    }

    console.log("Drive-a yüklənir...");
    await uploadJsonToDrive(accessToken, jsonString);

    return true;
  } catch (error: any) {
    console.error("Backup Action Error:", error);
    Alert.alert("Xəta", "Yedəkləmə zamanı xəta yarandı: " + error.message);
    return false;
  }
};
