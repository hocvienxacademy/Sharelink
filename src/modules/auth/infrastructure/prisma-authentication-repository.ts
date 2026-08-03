import type {
  AdminAuthenticationRecord,
  AdminIdentity,
  AuthenticationRepository,
  CreateAdminSessionInput,
} from "../application/authentication";
import { USER_ROLES, type UserRole } from "@/modules/users";
import {
  executePrismaOperation,
  prisma,
} from "@/shared/infrastructure/database/prisma";
import { AccountDisabledError, AccountLockedError } from "@/shared/errors";

interface StoredAdminSession {
  readonly role: UserRole;
  readonly userId: string;
}

function isStoredAdminSession(value: unknown): value is StoredAdminSession {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "userId" in value &&
    typeof value.userId === "string" &&
    "role" in value &&
    typeof value.role === "string" &&
    USER_ROLES.includes(value.role as UserRole)
  );
}

export class PrismaAuthenticationRepository
  implements AuthenticationRepository
{
  async findAdminByUsername(
    username: string,
  ): Promise<AdminAuthenticationRecord | null> {
    return executePrismaOperation(async () => {
      const users = await prisma.$queryRaw<
        Array<{
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          locked_until_epoch_ms: string | null;
          password_hash: string;
          role: UserRole;
          username: string;
        }>
      >`
        SELECT
          id,
          username,
          full_name,
          email,
          password_hash,
          role::text AS role,
          is_active,
          (EXTRACT(EPOCH FROM locked_until) * 1000)::text AS locked_until_epoch_ms
        FROM users
        WHERE lower(username) = ${username}
        LIMIT 1
      `;
      const user = users[0] ?? null;

      return user === null
        ? null
        : {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            email: user.email,
            passwordHash: user.password_hash,
            isActive: user.is_active,
            lockedUntil:
              user.locked_until_epoch_ms === null
                ? null
                : new Date(Number(user.locked_until_epoch_ms)),
            role: user.role,
          };
    });
  }

  async recordFailedLogin(input: {
    readonly userId: string;
    readonly attemptedAt: Date;
    readonly maximumAttempts: number;
    readonly lockedUntil: Date;
  }): Promise<void> {
    await executePrismaOperation(() =>
      prisma.$transaction(async (transaction) => {
        const updatedRows = await transaction.$queryRaw<
          Array<{ failed_login_attempts: number }>
        >`
          UPDATE users
          SET
            failed_login_attempts = failed_login_attempts + 1,
            updated_at = ${input.attemptedAt.toISOString()}::timestamptz
          WHERE id = ${input.userId}::uuid
            AND is_active = true
            AND (
              locked_until IS NULL
              OR locked_until <= ${input.attemptedAt.toISOString()}::timestamptz
            )
          RETURNING failed_login_attempts
        `;
        const updated = updatedRows[0];
        if (updated === undefined) return;

        if (updated.failed_login_attempts >= input.maximumAttempts) {
          await transaction.$executeRaw`
            UPDATE users
            SET
              locked_until = ${input.lockedUntil.toISOString()}::timestamptz,
              updated_at = ${input.attemptedAt.toISOString()}::timestamptz
            WHERE id = ${input.userId}::uuid
          `;
        }
      }),
    );
  }

  async createSession(input: CreateAdminSessionInput): Promise<void> {
    await executePrismaOperation(() =>
      prisma.$transaction(async (transaction) => {
        const states = await transaction.$queryRaw<
          Array<{ is_active: boolean; is_locked: boolean; role: string }>
        >`
          SELECT
            is_active,
            role::text AS role,
            locked_until > ${input.issuedAt.toISOString()}::timestamptz AS is_locked
          FROM users
          WHERE id = ${input.userId}::uuid
          FOR UPDATE
        `;
        const state = states[0] ?? null;

        if (
          state === null ||
          !USER_ROLES.includes(state.role as UserRole) ||
          state.role !== input.role ||
          !state.is_active
        ) {
          throw new AccountDisabledError();
        }
        if (state.is_locked) throw new AccountLockedError();

        await transaction.$executeRaw`
          UPDATE users
          SET
            last_login_at = ${input.issuedAt.toISOString()}::timestamptz,
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = ${input.issuedAt.toISOString()}::timestamptz
          WHERE id = ${input.userId}::uuid
        `;
        const sessionData = JSON.stringify({
          userId: input.userId,
          role: input.role,
          issuedAt: input.issuedAt.toISOString(),
        });
        await transaction.$executeRaw`
          INSERT INTO app_sessions (sid, sess, expire)
          VALUES (
            ${input.sessionId},
            ${sessionData}::jsonb,
            ${input.expiresAt.toISOString()}::timestamptz
          )
        `;
      }),
    );
  }

  async findIdentityBySessionId(
    sessionId: string,
    now: Date,
  ): Promise<AdminIdentity | null> {
    return executePrismaOperation(async () => {
      const sessions = await prisma.$queryRaw<Array<{ sess: unknown }>>`
        SELECT sess
        FROM app_sessions
        WHERE sid = ${sessionId}
          AND expire > ${now.toISOString()}::timestamptz
        LIMIT 1
      `;
      const session = sessions[0] ?? null;

      if (session === null || !isStoredAdminSession(session.sess)) {
        return null;
      }

      const user = await prisma.users.findFirst({
        where: {
          id: session.sess.userId,
          role: session.sess.role,
          is_active: true,
          OR: [{ locked_until: null }, { locked_until: { lte: now } }],
        },
        select: { id: true, username: true, full_name: true, email: true, role: true },
      });

      return user === null
        ? null
        : {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            email: user.email,
            role: user.role,
          };
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await executePrismaOperation(async () => {
      await prisma.app_sessions.deleteMany({ where: { sid: sessionId } });
    });
  }
}
