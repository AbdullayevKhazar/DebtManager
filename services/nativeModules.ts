import Constants, { ExecutionEnvironment } from "expo-constants";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const GoogleSignin = isExpoGo
  ? null
  : require("@react-native-google-signin/google-signin").GoogleSignin;

export const Purchases = isExpoGo
  ? null
  : require("react-native-purchases").default;
