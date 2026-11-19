import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

// Expo Go yoxlaması
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Google OAuth konfiqurasiyası
const GOOGLE_WEB_CLIENT_ID =
  "359704388362-7034k3rac07ism33i8gri5edpeoavl6k.apps.googleusercontent.com";

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

// Google Drive API ünvanları
const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

const FILES_URL = "https://www.googleapis.com/drive/v3/files";

// Google Sign-In konfiqurasiya vəziyyəti
let isGoogleConfigured = false;

/**
 * Google Sign-In konfiqurasiyası.
 *
 * Expo Go-da native modul yüklənmir.
 * Development Build-də Google Sign-In aktivləşdirilir.
 */
export const configureGoogleSignIn = async (): Promise<boolean> => {
  if (isExpoGo) {
    console.log("Google Sign-In Expo Go-da dəstəklənmir.");
    return false;
  }

  if (isGoogleConfigured) {
    return true;
  }

  try {
    const { GoogleSignin } =
      await import("@react-native-google-signin/google-signin");

    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: [GOOGLE_DRIVE_SCOPE],
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });

    isGoogleConfigured = true;
    return true;
  } catch (error) {
    console.error("Google Sign-In konfiqurasiya xətası:", error);
    return false;
  }
};

/**
 * Google hesabına giriş.
 * Uğurlu olduqda accessToken qaytarır.
 * İstifadəçi girişi ləğv edərsə null qaytarır.
 */
export const signInWithGoogle = async (): Promise<string | null> => {
  if (isExpoGo) {
    throw new Error(
      "Google Drive backup üçün Development Build tələb olunur. " +
        "Expo Go Google Sign-In native modulunu dəstəkləmir.",
    );
  }

  const configured = await configureGoogleSignIn();

  if (!configured) {
    throw new Error("Google Sign-In konfiqurasiya edilə bilmədi.");
  }

  const { GoogleSignin, statusCodes } =
    await import("@react-native-google-signin/google-signin");

  try {
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const result = await GoogleSignin.signIn();

    if (result.type === "cancelled") {
      return null;
    }

    const tokens = await GoogleSignin.getTokens();

    if (!tokens.accessToken) {
      throw new Error("Google access token alınmadı.");
    }

    return tokens.accessToken;
  } catch (error: unknown) {
    const err = error as {
      code?: string;
      message?: string;
    };

    if (err.code === "SIGN_IN_CANCELLED") {
      return null;
    }

    if (err.code === statusCodes.IN_PROGRESS) {
      throw new Error("Google giriş prosesi artıq davam edir.");
    }

    console.error("Google giriş xətası:", error);

    throw new Error("Google giriş xətası: " + (err.message || "Naməlum xəta"));
  }
};

/**
 * Google Drive API sorğularında
 * xəta cavablarını yoxlayır.
 */
const checkDriveResponse = async (
  response: Response,
  operation: string,
): Promise<void> => {
  if (!response.ok) {
    const errorText = await response.text();

    console.error(`${operation} xətası:`, errorText);

    throw new Error(
      `${operation} uğursuz oldu. ` + `HTTP ${response.status}: ${errorText}`,
    );
  }
};

/**
 * JSON məlumatlarını Google Drive-a yükləyir.
 *
 * Əvvəlki backup fayl formatını saxlayır.
 */
export const uploadJsonToDrive = async (
  accessToken: string,
  jsonString: string,
) => {
  // JSON-un düzgünlüyünü yoxla
  try {
    JSON.parse(jsonString);
  } catch {
    throw new Error("Backup məlumatı düzgün JSON deyil.");
  }

  const date = new Date().toISOString().split("T")[0];

  const metadata = {
    name: `borc_manager_backup_${date}.json`,
    mimeType: "application/json",
  };

  const boundary = `backup_${Date.now()}`;

  const CRLF = "\r\n";

  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    jsonString,
    `--${boundary}--`,
    "",
  ].join(CRLF);

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  await checkDriveResponse(response, "Backup yükləmə");

  return await response.json();
};

/**
 * Tətbiqin Google Drive backup fayllarını
 * tarixə görə sıralayaraq qaytarır.
 */
export const listBackups = async (accessToken: string) => {
  const query = encodeURIComponent(
    "trashed = false and mimeType = 'application/json'",
  );

  const fields = encodeURIComponent("nextPageToken,files(id,name,createdTime)");

  const url =
    `${FILES_URL}?q=${query}` +
    `&fields=${fields}` +
    "&orderBy=createdTime%20desc&pageSize=100";

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await checkDriveResponse(response, "Backup siyahısı");

  return await response.json();
};

/**
 * Google Drive-dan backup JSON faylını endirir.
 *
 * Mövcud sistemə uyğun olaraq JSON string qaytarır.
 */
export const downloadBackup = async (
  accessToken: string,
  fileId: string,
): Promise<string> => {
  if (!fileId) {
    throw new Error("Backup faylının ID-si tapılmadı.");
  }

  const url = `${FILES_URL}/${encodeURIComponent(fileId)}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await checkDriveResponse(response, "Backup endirmə");

  const jsonString = await response.text();

  try {
    JSON.parse(jsonString);
  } catch {
    throw new Error("Endirilən backup faylı düzgün JSON formatında deyil.");
  }

  return jsonString;
};
