import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt-v1";
const DUMMY_PASSWORD_HASH =
  "scrypt-v1$8JFF_g74YQLtANAg9meghg$IfMVc2OsiBYps2ZVR-_esExx_JyF7OhIdAAZ2vlQFXWbzBXhvKA4FYnZe229fpQVpu3cYdB0zHNetqgwp8qaYw";

type DerivePasswordKey = (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

const derivePasswordKey: DerivePasswordKey = async (
  password,
  salt,
  keyLength,
) => (await scrypt(password, salt, keyLength)) as Buffer;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await derivePasswordKey(password, salt, KEY_LENGTH);

  return [HASH_PREFIX, salt.toString("base64url"), derivedKey.toString("base64url")].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
  derive: DerivePasswordKey = derivePasswordKey,
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

  const expectedKey = Buffer.from(keyValue, "base64url");
  if (expectedKey.length !== KEY_LENGTH) return false;

  const actualKey = await derive(
    password,
    Buffer.from(saltValue, "base64url"),
    KEY_LENGTH,
  );

  return timingSafeEqual(actualKey, expectedKey);
}

export async function verifyPasswordOrDummy(
  password: string,
  encodedHash: string | null,
  derive: DerivePasswordKey = derivePasswordKey,
): Promise<boolean> {
  return verifyPassword(password, encodedHash ?? DUMMY_PASSWORD_HASH, derive);
}
