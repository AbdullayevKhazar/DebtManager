import AsyncStorage from "@react-native-async-storage/async-storage";

const DRIVE_BACKUP_KEY = "last_drive_backup_timestamp";
const DAYS_INTERVAL = 3;

// Nəticə tipi
type BackupCheckResult = {
  needsBackup: boolean;
  message: string;
};

// 1. Yalnız yoxlama aparan funksiya
export const checkBackupStatus = async (): Promise<BackupCheckResult> => {
  try {
    const lastBackupStr = await AsyncStorage.getItem(DRIVE_BACKUP_KEY);
    const lastBackupTime = lastBackupStr ? parseInt(lastBackupStr) : null;
    const currentTime = Date.now();

    // HAL 1: İlk dəfə
    if (lastBackupTime === null) {
      return {
        needsBackup: true,
        message:
          "Siz hələ heç vaxt məlumatları Google Drive-a yedəkləməmisiniz. İlk yedəkləməni etmək istəyirsiniz?",
      };
    }

    // HAL 2: Vaxt fərqi
    const diffDays = (currentTime - lastBackupTime) / (1000 * 60 * 60 * 24);
    if (diffDays >= DAYS_INTERVAL) {
      return {
        needsBackup: true,
        message: `Son yedəkləmədən ${Math.floor(diffDays)} gün keçib. Məlumatları yeniləmək istəyirsiniz?`,
      };
    }

    return { needsBackup: false, message: "" };
  } catch (error) {
    console.error("Scheduler error:", error);
    return { needsBackup: false, message: "" };
  }
};

// 2. Tarixi yeniləyən funksiya (Uğurlu olanda çağıracağıq)
export const updateLastBackupDate = async () => {
  await AsyncStorage.setItem(DRIVE_BACKUP_KEY, Date.now().toString());
};
