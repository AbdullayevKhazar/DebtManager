import { Buffer } from "buffer";
import * as Random from "expo-random";
import Aes from "react-native-aes-crypto";

const generateKey = async (password: string, salt: string) => {
  return await Aes.pbkdf2(password, salt, 5000, 256, "sha256");
};

export const encryptData = async (text: string, password: string) => {
  const salt = Buffer.from(Random.getRandomBytes(16)).toString("hex");
  const iv = Buffer.from(Random.getRandomBytes(16)).toString("hex");

  const key = await generateKey(password, salt);

  const encrypted = await Aes.encrypt(text, key, iv, "aes-256-cbc");

  return JSON.stringify({
    v: 1,
    salt,
    iv,
    data: encrypted,
  });
};

export const decryptData = async (payload: string, password: string) => {
  const parsed = JSON.parse(payload);

  const key = await generateKey(password, parsed.salt);

  return await Aes.decrypt(parsed.data, key, parsed.iv, "aes-256-cbc");
};
