import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useSQLiteContext } from "expo-sqlite";
import {
  configureGoogleSignIn,
  downloadBackup,
  listBackups,
  signInWithGoogle,
} from "@/backend/driveService";
import { performFullDriveBackup } from "@/backend/backupAction";
import { authenticateUser } from "@/backend/biometricAuthentication";
import { updateLastBackupDate } from "@/backend/driveScheduler";
import { restoreFromBackupString } from "@/backend/backupManager";

export type SettingsBusyAction = "backup" | "list" | "restore" | null;
export type SettingsDialogMode = "choose" | "confirm" | null;
export type SettingsNotice = {
  id: number;
  action: "success" | "error" | "warning" | "info";
  message: string;
  title?: string;
};
export type SettingsBackupFile = {
  id: string;
  name: string;
  createdTime?: string;
};

function isBackupFile(value: unknown): value is SettingsBackupFile {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.name === "string" &&
    item.name.length > 0 &&
    (item.createdTime === undefined || typeof item.createdTime === "string")
  );
}

/** Settings ekranının state və əməliyyatları. JSX/UI bu faylda yoxdur. */
export function useSettings() {
  const db = useSQLiteContext();

  // Biometrik giriş
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);
  const [isUpdatingBiometrics, setIsUpdatingBiometrics] = useState(false);
  const biometricBusyRef = useRef(false);

  // Google Drive iş axını
  const [busyAction, setBusyAction] = useState<SettingsBusyAction>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  // Bərpa dialoqu
  const [dialogMode, setDialogMode] = useState<SettingsDialogMode>(null);
  const [driveFiles, setDriveFiles] = useState<SettingsBackupFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SettingsBackupFile | null>(
    null,
  );

  // Custom Toast öz görünüşünü idarə edir; hook yalnız bildiriş məlumatı verir.
  const [notice, setNotice] = useState<SettingsNotice | null>(null);
  const noticeIdRef = useRef(0);
  const clearNotice = useCallback(() => setNotice(null), []);
  const showNotice = useCallback(
    (message: string, action: SettingsNotice["action"], title?: string) => {
      setNotice({ id: ++noticeIdRef.current, message, action, title });
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await configureGoogleSignIn();
      } catch (error) {
        console.error("Google Sign-In configuration error:", error);
      }
    })();

    void (async () => {
      try {
        const [storedValue, hasHardware, enrolled] = await Promise.all([
          AsyncStorage.getItem("settings_biometrics"),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        if (!mounted) return;
        const supported = hasHardware && enrolled;
        setIsBiometricSupported(supported);
        // Cihazda biometrika silinibsə, aktiv kimi göstərmirik.
        // Yaddaşdakı seçimi səssizcə dəyişmirik.
        setBiometricsEnabled(supported && storedValue === "true");
      } catch (error) {
        console.error("Read biometric settings error:", error);
        if (mounted)
          showNotice("Biometrik giriş parametrləri oxunmadı.", "error");
      } finally {
        if (mounted) setIsCheckingBiometrics(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [showNotice]);

  const startAction = useCallback(
    (action: Exclude<SettingsBusyAction, null>) => {
      if (busyRef.current || biometricBusyRef.current) return false;
      busyRef.current = true;
      setBusyAction(action);
      return true;
    },
    [],
  );

  const finishAction = useCallback(() => {
    busyRef.current = false;
    setBusyAction(null);
    setStatus("");
  }, []);

  const toggleBiometrics = useCallback(
    async (enabled: boolean) => {
      if (biometricBusyRef.current || busyRef.current || isCheckingBiometrics)
        return;
      if (enabled && !isBiometricSupported) {
        showNotice(
          "Cihazda barmaq izi və ya üz tanıma aktiv deyil.",
          "warning",
        );
        return;
      }
      biometricBusyRef.current = true;
      setIsUpdatingBiometrics(true);
      try {
        if (enabled) {
          const authenticated = await authenticateUser();
          if (!authenticated) {
            showNotice("Biometrik təsdiq tamamlanmadı.", "warning");
            return;
          }
        }
        await AsyncStorage.setItem(
          "settings_biometrics",
          JSON.stringify(enabled),
        );
        setBiometricsEnabled(enabled);
        showNotice(
          enabled
            ? "Biometrik giriş aktivləşdirildi."
            : "Biometrik giriş söndürüldü.",
          "success",
        );
      } catch (error) {
        console.error("Toggle biometrics error:", error);
        showNotice("Biometrik giriş ayarı yadda saxlanmadı.", "error");
      } finally {
        biometricBusyRef.current = false;
        setIsUpdatingBiometrics(false);
      }
    },
    [isCheckingBiometrics, isBiometricSupported, showNotice],
  );

  const handleBackup = useCallback(async () => {
    if (!startAction("backup")) return;
    setStatus("Google Drive-a yedəklənir...");
    try {
      const saved = await performFullDriveBackup(db);
      if (!saved) {
        showNotice("Yedəkləmə tamamlanmadı. Yenidən cəhd edin.", "warning");
        return;
      }
      try {
        await updateLastBackupDate();
        showNotice("Məlumatlar Google Drive-a yedəkləndi.", "success");
      } catch (error) {
        console.error("Save last backup date error:", error);
        showNotice(
          "Yedəkləmə uğurludur, lakin son tarix saxlanmadı.",
          "warning",
        );
      }
    } catch (error) {
      console.error("Google Drive backup error:", error);
      showNotice("Yedəkləmə zamanı xəta baş verdi.", "error");
    } finally {
      finishAction();
    }
  }, [db, startAction, finishAction, showNotice]);

  const handleRestoreClick = useCallback(async () => {
    if (!startAction("list")) return;
    setStatus("Google Drive-dakı nüsxələr yoxlanılır...");
    try {
      const token = await signInWithGoogle();
      if (!token) {
        showNotice("Google hesabına qoşulma tamamlanmadı.", "warning");
        return;
      }
      accessTokenRef.current = token;
      setAccessToken(token);

      const response = await listBackups(token);
      const files = Array.isArray(response?.files)
        ? (response.files as unknown[]).filter(isBackupFile)
        : [];
      if (files.length === 0) {
        showNotice("Google Drive-da yedək faylı tapılmadı.", "info");
        return;
      }
      // Servis qaytardığı siyahının sırası dəyişdirilmir.
      setDriveFiles(files);
      setSelectedFile(null);
      setDialogMode("choose");
    } catch (error) {
      console.error("List Google Drive backups error:", error);
      showNotice("Drive nüsxələri yüklənə bilmədi.", "error");
    } finally {
      finishAction();
    }
  }, [startAction, finishAction, showNotice]);

  const closeDialog = useCallback(() => {
    if (busyRef.current) return;
    setDialogMode(null);
    setSelectedFile(null);
  }, []);

  const selectBackupFile = useCallback((file: SettingsBackupFile) => {
    if (busyRef.current) return;
    setSelectedFile(file);
    setDialogMode("confirm");
  }, []);

  const backToFileList = useCallback(() => {
    if (busyRef.current) return;
    setDialogMode("choose");
  }, []);

  const handleRestore = useCallback(async () => {
    const file = selectedFile;
    if (!file || !startAction("restore")) return;
    const token = accessTokenRef.current;
    if (!token) {
      showNotice("Google sessiyası bitib. Yenidən qoşulun.", "warning");
      setDialogMode(null);
      setSelectedFile(null);
      finishAction();
      return;
    }

    try {
      setStatus("Yedək faylı endirilir...");
      const backupContent = await downloadBackup(token, file.id);
      setStatus("Məlumatlar bazaya bərpa edilir...");
      const result = await restoreFromBackupString(db, backupContent);
      setDialogMode(null);
      setSelectedFile(null);
      showNotice(
        `${result.importedDebtors} borclu və ${result.importedTransactions} əməliyyat birləşdirildi.`,
        "success",
        "Bərpa tamamlandı",
      );
    } catch (error) {
      console.error("Restore Google Drive backup error:", error);
      setDialogMode(null);
      showNotice(
        "Bərpa baş tutmadı. İnternet və ehtiyat nüsxəni yoxlayın.",
        "error",
      );
    } finally {
      finishAction();
    }
  }, [selectedFile, db, startAction, finishAction, showNotice]);

  return {
    biometricsEnabled,
    isBiometricSupported,
    isCheckingBiometrics,
    isUpdatingBiometrics,
    toggleBiometrics,
    busyAction,
    isBusy: busyAction !== null,
    status,
    accessToken,
    handleBackup,
    handleRestoreClick,
    dialogMode,
    driveFiles,
    selectedFile,
    closeDialog,
    selectBackupFile,
    backToFileList,
    handleRestore,
    notice,
    clearNotice,
  };
}
