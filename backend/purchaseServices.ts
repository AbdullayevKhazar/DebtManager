import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { PURCHASE_ENTITLEMENT_CACHE_KEY } from "./entitlementKeys";

const API_KEYS = {
  apple: "appl_SizinAppleKeyBuraya",
  google: "goog_SizinGoogleKeyBuraya",
};

const ENTITLEMENT_ID = "pro_access";
const hasRevenueCatConfiguration =
  !API_KEYS.apple.includes("Sizin") && !API_KEYS.google.includes("Sizin");
let isInitialized = false;

export const PurchaseService = {
  init: async (): Promise<boolean> => {
    if (!hasRevenueCatConfiguration) {
      console.warn("RevenueCat is not configured. Purchases are unavailable.");
      return false;
    }
    if (isInitialized) return true;
    try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      if (Platform.OS === "ios") {
        Purchases.configure({ apiKey: API_KEYS.apple });
      } else if (Platform.OS === "android") {
        Purchases.configure({ apiKey: API_KEYS.google });
      }

      isInitialized = true;
      await PurchaseService.checkProStatus();
      return true;
    } catch (e) {
      console.error("RevenueCat Init Error:", e);
      return false;
    }
  },

  getOfferings: async (): Promise<PurchasesOffering | null> => {
    try {
      if (!(await PurchaseService.init())) return null;
      const offerings = await Purchases.getOfferings();

      if (
        offerings.current !== null &&
        offerings.current.availablePackages.length !== 0
      ) {
        return offerings.current;
      }

      console.warn(
        "RevenueCat: Paket tapılmadı. Dashboard-da 'Current Offering' qurulduğuna əmin olun.",
      );
      return null;
    } catch (e) {
      console.error("Error fetching offerings:", e);
      return null;
    }
  },

  purchasePackage: async (pack: PurchasesPackage): Promise<boolean> => {
    try {
      if (!(await PurchaseService.init())) return false;
      const { customerInfo } = await Purchases.purchasePackage(pack);
      return PurchaseService.handleCustomerInfo(customerInfo);
    } catch (e: any) {
      if (e.userCancelled) {
        console.log("İstifadəçi ləğv etdi");
      } else {
        console.error("Purchase Error:", e);
      }
      return false;
    }
  },

  restorePurchases: async (): Promise<boolean> => {
    try {
      if (!(await PurchaseService.init())) return false;
      const customerInfo = await Purchases.restorePurchases();
      return PurchaseService.handleCustomerInfo(customerInfo);
    } catch (e) {
      console.error("Restore Error:", e);
      return false;
    }
  },

  checkProStatus: async (): Promise<boolean> => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return PurchaseService.handleCustomerInfo(customerInfo);
    } catch (e) {
      const localStatus = await AsyncStorage.getItem(
        PURCHASE_ENTITLEMENT_CACHE_KEY,
      );
      return localStatus === "true";
    }
  },

  handleCustomerInfo: async (customerInfo: any): Promise<boolean> => {
    try {
      const isPro =
        customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      await AsyncStorage.setItem(
        PURCHASE_ENTITLEMENT_CACHE_KEY,
        isPro ? "true" : "false",
      );
      return isPro;
    } catch (e) {
      console.error("Error handling customer info", e);
      return false;
    }
  },
};
