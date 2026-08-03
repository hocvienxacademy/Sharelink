import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  AccountDisabledError,
  AccountLockedError,
  ConflictError,
  InternalServerError,
  UnauthorizedError,
} from "@/shared/errors";
import { parseWithSchema } from "@/shared/validation";

export const ADMIN_SESSION_COOKIE = "sls_admin_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const SESSION_CREATION_ATTEMPTS = 2;

const loginUsernameSchema = z
  .string("Vui lòng nhập tên đăng nhập.")
  .trim()
  .min(1, "Vui lòng nhập tên đăng nhập.")
  .max(100, "Tên đăng nhập không được vượt quá 100 ký tự.")
  .transform((value) => value.toLowerCase());

const loginInputSchema = z
  .object({
    username: loginUsernameSchema,
    password: z
      .string("Vui lòng nhập mật khẩu.")
      .min(1, "Vui lòng nhập mật khẩu.")
      .max(128, "Mật khẩu không được vượt quá 128 ký tự."),
  })
  .strict();

export interface LoginInput {
  readonly username: string;
  readonly password: string;
}

export function parseLoginInput(input: unknown): LoginInput {
  return parseWithSchema(
    loginInputSchema,
    input,
    "Dữ liệu đăng nhập không hợp lệ.",
  );
}

export function normalizeLoginUsername(input: unknown): string | null {
  const parsed = loginUsernameSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export interface AdminIdentity {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: "ADMIN";
}

export interface AuthenticatedAdminSession {
  readonly identity: AdminIdentity;
  readonly expiresAt: Date;
  readonly token: string;
}

export interface AdminAuthenticationRecord {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly isActive: boolean;
  readonly lockedUntil: Date | null;
}

export interface CreateAdminSessionInput {
  readonly sessionId: string;
  readonly userId: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
}

export interface AuthenticationRepository {
  findAdminByUsername(username: string): Promise<AdminAuthenticationRecord | null>;
  recordFailedLogin(input: {
    readonly userId: string;
    readonly attemptedAt: Date;
    readonly maximumAttempts: number;
    readonly lockedUntil: Date;
  }): Promise<void>;
  createSession(input: CreateAdminSessionInput): Promise<void>;
  findIdentityBySessionId(
    sessionId: string,
    now: Date,
  ): Promise<AdminIdentity | null>;
  revokeSession(sessionId: string): Promise<void>;
}

export type PasswordVerifier = (
  password: string,
  encodedHash: string | null,
) => Promise<boolean>;

interface AuthenticationServiceOptions {
  readonly now?: () => Date;
  readonly token?: () => string;
  readonly verifyPassword: PasswordVerifier;
}

function sessionId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export class AdminAuthenticationService {
  private readonly now: () => Date;
  private readonly token: () => string;
  private readonly verifyPassword: PasswordVerifier;

  constructor(
    private readonly repository: AuthenticationRepository,
    options: AuthenticationServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date());
    this.token = options.token ?? (() => randomBytes(32).toString("base64url"));
    this.verifyPassword = options.verifyPassword;
  }

  async authenticate(
    input: unknown,
    environment: Readonly<Record<string, string | undefined>> = process.env,
  ): Promise<AuthenticatedAdminSession> {
    const values = parseLoginInput(input);
    const attemptedAt = this.now();
    const user = await this.repository.findAdminByUsername(values.username);

    let passwordIsValid: boolean;
    try {
      passwordIsValid = await this.verifyPassword(
        values.password,
        user?.passwordHash ?? null,
      );
    } catch (error: unknown) {
      throw new InternalServerError({ cause: error });
    }

    const isLocked =
      user?.lockedUntil !== null &&
      user?.lockedUntil !== undefined &&
      user.lockedUntil > attemptedAt;

    if (user === null || !passwordIsValid) {
      if (user !== null && user.isActive && !isLocked) {
        const maximumAttempts = positiveInteger(
          environment.ADMIN_LOGIN_MAX_ATTEMPTS,
          5,
        );
        const lockSeconds = positiveInteger(
          environment.ADMIN_LOGIN_LOCK_SECONDS,
          900,
        );
        await this.repository.recordFailedLogin({
          userId: user.id,
          attemptedAt,
          maximumAttempts,
          lockedUntil: new Date(attemptedAt.getTime() + lockSeconds * 1000),
        });
      }
      throw new UnauthorizedError();
    }

    if (!user.isActive) throw new AccountDisabledError();
    if (isLocked) throw new AccountLockedError();

    const expiresAt = new Date(attemptedAt.getTime() + SESSION_DURATION_MS);
    let lastConflict: ConflictError | null = null;

    for (let attempt = 0; attempt < SESSION_CREATION_ATTEMPTS; attempt += 1) {
      const token = this.token();
      try {
        await this.repository.createSession({
          sessionId: sessionId(token),
          userId: user.id,
          issuedAt: attemptedAt,
          expiresAt,
        });
        return {
          token,
          expiresAt,
          identity: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: "ADMIN",
          },
        };
      } catch (error: unknown) {
        if (!(error instanceof ConflictError)) throw error;
        lastConflict = error;
      }
    }

    throw lastConflict ?? new ConflictError();
  }

  async getIdentity(token: string | undefined): Promise<AdminIdentity | null> {
    if (!token || token.length > 255) return null;
    return this.repository.findIdentityBySessionId(
      sessionId(token),
      this.now(),
    );
  }

  async revoke(token: string | undefined): Promise<void> {
    if (!token || token.length > 255) return;
    await this.repository.revokeSession(sessionId(token));
  }
}
