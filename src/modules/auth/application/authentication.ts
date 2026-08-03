import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { UnauthorizedError } from "@/shared/errors";
import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";
import { verifyPassword } from "../infrastructure/security/password";

export const ADMIN_SESSION_COOKIE = "sls_admin_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  "scrypt-v1$8JFF_g74YQLtANAg9meghg$IfMVc2OsiBYps2ZVR-_esExx_JyF7OhIdAAZ2vlQFXWbzBXhvKA4FYnZe229fpQVpu3cYdB0zHNetqgwp8qaYw";

const loginInputSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(128),
});

export interface AdminIdentity {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: "ADMIN";
}

export interface AuthenticatedAdminSession {
  readonly identity: AdminIdentity;
  readonly expiresAt: Date;
  readonly token: string;
}

function sessionId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function recordFailedLogin(
  userId: string,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<void> {
  const maximumAttempts = positiveInteger(
    environment.ADMIN_LOGIN_MAX_ATTEMPTS,
    5,
  );
  const lockSeconds = positiveInteger(environment.ADMIN_LOGIN_LOCK_SECONDS, 900);

  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.users.update({
      where: { id: userId },
      data: {
        failed_login_attempts: { increment: 1 },
        updated_at: new Date(),
      },
      select: { failed_login_attempts: true },
    });

    if (updated.failed_login_attempts >= maximumAttempts) {
      await transaction.users.update({
        where: { id: userId },
        data: {
          locked_until: new Date(Date.now() + lockSeconds * 1000),
          updated_at: new Date(),
        },
      });
    }
  });
}

function localAdminEmail(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  return (
    environment.LOCAL_ADMIN_EMAIL ?? "admin@local.sharelinkstudent.test"
  ).toLowerCase();
}

export function resolveAdminLoginEmail(
  identifier: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const normalized = identifier.trim().toLowerCase();
  const localUsername = (environment.LOCAL_ADMIN_USERNAME ?? "admin")
    .trim()
    .toLowerCase();

  if (environment.APP_ENV === "development" && normalized === localUsername) {
    return localAdminEmail(environment);
  }

  return normalized;
}

export async function authenticateAdmin(
  input: unknown,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<AuthenticatedAdminSession> {
  const parsed = loginInputSchema.safeParse(input);
  if (!parsed.success) throw new UnauthorizedError();

  const email = resolveAdminLoginEmail(parsed.data.identifier, environment);
  const user = await prisma.users.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      role: "ADMIN",
      is_active: true,
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      password_hash: true,
      locked_until: true,
    },
  });

  const passwordIsValid = await verifyPassword(
    parsed.data.password,
    user?.password_hash ?? DUMMY_PASSWORD_HASH,
  );
  if (
    user === null ||
    !passwordIsValid ||
    (user.locked_until !== null && user.locked_until > new Date())
  ) {
    if (
      user !== null &&
      !passwordIsValid &&
      (user.locked_until === null || user.locked_until <= new Date())
    ) {
      await recordFailedLogin(user.id, environment);
    }
    throw new UnauthorizedError();
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const now = new Date();

  await prisma.$transaction([
    prisma.users.update({
      where: { id: user.id },
      data: {
        last_login_at: now,
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: now,
      },
    }),
    prisma.app_sessions.create({
      data: {
        sid: sessionId(token),
        expire: expiresAt,
        sess: {
          userId: user.id,
          role: user.role,
          issuedAt: now.toISOString(),
        },
      },
    }),
  ]);

  return {
    token,
    expiresAt,
    identity: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: "ADMIN",
    },
  };
}

export async function getAdminIdentityBySessionToken(
  token: string | undefined,
): Promise<AdminIdentity | null> {
  if (!token || token.length > 255) return null;

  const session = await prisma.app_sessions.findFirst({
    where: {
      sid: sessionId(token),
      expire: { gt: new Date() },
    },
    select: { sess: true },
  });

  if (
    session === null ||
    typeof session.sess !== "object" ||
    session.sess === null ||
    Array.isArray(session.sess) ||
    typeof session.sess.userId !== "string" ||
    session.sess.role !== "ADMIN"
  ) {
    return null;
  }

  const user = await prisma.users.findFirst({
    where: {
      id: session.sess.userId,
      role: "ADMIN",
      is_active: true,
    },
    select: { id: true, full_name: true, email: true },
  });

  return user === null
    ? null
    : {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: "ADMIN",
      };
}

export async function revokeAdminSession(token: string | undefined): Promise<void> {
  if (!token || token.length > 255) return;
  await prisma.app_sessions.deleteMany({ where: { sid: sessionId(token) } });
}
