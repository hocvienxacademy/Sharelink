import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt-v1";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return [HASH_PREFIX, salt.toString("base64url"), derivedKey.toString("base64url")].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [prefix, saltValue, keyValue, unexpected] = encodedHash.split("$");
  if (
    prefix !== HASH_PREFIX ||
    !saltValue ||
    !keyValue ||
    unexpected !== undefined
  ) {
    return false;
  }

  try {
    const expectedKey = Buffer.from(keyValue, "base64url");
    if (expectedKey.length !== KEY_LENGTH) return false;

    const actualKey = (await scrypt(
      password,
      Buffer.from(saltValue, "base64url"),
      KEY_LENGTH,
    )) as Buffer;

    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}
