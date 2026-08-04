import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { executePrismaOperation, prisma } from "@/shared/infrastructure/database/prisma";
import type { AuthenticatedActor } from "@/shared/authorization";
import { toUserAccountStatus, type CreatedUser, type UserAccountStatus, type UserRole } from "../domain/user";
import type {
  CreateUserPersistenceInput, UserCommand, UserDetail, UserHistoryItem, UserListItem,
  UserMutationResult, UserManagementRepository,
} from "../application/ports/user-repository";
import type { AccountTransitionInput, ManagerAssignmentInput, ProfileUpdateInput, RoleChangeInput } from "../application/validation/user-management-schemas";

type LockedUser = {
  id: string; role: UserRole; manager_id: string | null; is_active: boolean; updated_at: Date;
  failed_login_attempts: number; locked_until: Date | null; full_name: string; username: string;
  email: string; phone: string | null;
};

const result = (user: { id: string; role: UserRole; is_active: boolean; updated_at: Date }): UserMutationResult => ({
  id: user.id, role: user.role, status: toUserAccountStatus(user.is_active), updatedAt: user.updated_at,
});

export class PrismaUserRepository implements UserManagementRepository {
  async create(input: CreateUserPersistenceInput): Promise<CreatedUser> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`users:create:${input.username}`}))::text`;
      const existing = await transaction.users.findFirst({
        where: { OR: [
          { email: { equals: input.email, mode: "insensitive" } },
          { username: { equals: input.username, mode: "insensitive" } },
          ...(input.phone === null ? [] : [{ phone: input.phone }]),
        ] }, select: { id: true },
      });
      if (existing !== null) throw new ConflictError("Tên đăng nhập, email hoặc số điện thoại đã được sử dụng.");
      await this.assertManager(transaction, input.role, input.managerId);
      const now = new Date();
      const user = await transaction.users.create({ data: {
        username: input.username, full_name: input.fullName, email: input.email, phone: input.phone,
        password_hash: input.passwordHash, role: input.role, manager_id: input.managerId,
        is_active: true, password_changed_at: now, updated_at: now,
      }, select: { id: true } });
      await transaction.audit_logs.create({ data: {
        actor_id: input.actorId, action: "USER_CREATED", entity_type: "users", entity_id: user.id,
        new_values: { role: input.role, status: "ACTIVE", managerId: input.managerId },
      } });
      return { id: user.id };
    }));
  }

  async findAuthorizationResource(id: string) {
    const user = await executePrismaOperation(() => prisma.users.findUnique({ where: { id }, select: { id: true, role: true, manager_id: true } }));
    return user === null ? null : { id: user.id, role: user.role, managerId: user.manager_id };
  }

  async list(actor: AuthenticatedActor): Promise<readonly UserListItem[]> {
    const records = await executePrismaOperation(() => prisma.users.findMany({
      where: actor.role === "ADMIN" ? undefined : { role: "SALE", manager_id: actor.userId },
      orderBy: { full_name: "asc" }, take: 100,
      select: { id: true, username: true, full_name: true, role: true, is_active: true, updated_at: true, users: { select: { full_name: true } } },
    }));
    return records.map((user) => ({ id: user.id, username: user.username, fullName: user.full_name, role: user.role,
      status: toUserAccountStatus(user.is_active), managerName: user.users?.full_name ?? null, updatedAt: user.updated_at }));
  }

  async findDetail(actor: AuthenticatedActor, id: string): Promise<UserDetail | null> {
    const user = await executePrismaOperation(() => prisma.users.findFirst({
      where: { id, ...(actor.role === "ADMIN" ? {} : { role: "SALE", manager_id: actor.userId }) },
      select: { id: true, username: true, full_name: true, email: true, phone: true, role: true, manager_id: true,
        is_active: true, failed_login_attempts: true, locked_until: true, last_login_at: true,
        password_changed_at: true, created_at: true, updated_at: true, users: { select: { full_name: true } } },
    }));
    if (user === null) return null;
    const admin = actor.role === "ADMIN";
    return { id: user.id, username: user.username, fullName: user.full_name, role: user.role,
      status: toUserAccountStatus(user.is_active), managerName: user.users?.full_name ?? null, managerId: user.manager_id,
      updatedAt: user.updated_at, email: admin ? user.email : null, phone: admin ? user.phone : null,
      lastLoginAt: admin ? user.last_login_at : null, failedLoginAttempts: admin ? user.failed_login_attempts : null,
      lockedUntil: admin ? user.locked_until : null, passwordChangedAt: admin ? user.password_changed_at : null,
      createdAt: admin ? user.created_at : null };
  }

  async findHistory(actor: AuthenticatedActor, id: string): Promise<readonly UserHistoryItem[] | null> {
    const allowed = await executePrismaOperation(() => prisma.users.findFirst({ where: { id, ...(actor.role === "ADMIN" ? {} : { role: "SALE", manager_id: actor.userId }) }, select: { id: true } }));
    if (allowed === null) return null;
    const records = await executePrismaOperation(() => prisma.audit_logs.findMany({
      where: { entity_type: "users", entity_id: id }, orderBy: [{ created_at: "desc" }, { id: "desc" }], take: 100,
      select: { id: true, action: true, created_at: true, users: { select: { full_name: true } } },
    }));
    return records.map((item) => ({ id: item.id, action: item.action, actorName: item.users?.full_name ?? null, occurredAt: item.created_at }));
  }

  async updateProfile(command: UserCommand<ProfileUpdateInput>): Promise<UserMutationResult> {
    return this.mutate(command, "USER_PROFILE_UPDATED", async (transaction, current, now) => {
      const data = {
        ...(command.values.fullName === undefined ? {} : { full_name: command.values.fullName }),
        ...(command.values.username === undefined ? {} : { username: command.values.username }),
        ...(command.values.email === undefined ? {} : { email: command.values.email }),
        ...(command.values.phone === undefined ? {} : { phone: command.values.phone }), updated_at: now,
      };
      const changedFields = [
        command.values.fullName !== undefined && command.values.fullName !== current.full_name ? "fullName" : null,
        command.values.username !== undefined && command.values.username !== current.username ? "username" : null,
        command.values.email !== undefined && command.values.email !== current.email ? "email" : null,
        command.values.phone !== undefined && command.values.phone !== current.phone ? "phone" : null,
      ].filter((field): field is string => field !== null);
      if (changedFields.length === 0) throw new ConflictError("Thông tin tài khoản không thay đổi.");
      const updated = await transaction.users.update({ where: { id: command.id }, data, select: { id: true, role: true, is_active: true, updated_at: true } });
      return { updated, metadata: { changedFields } };
    });
  }

  async changeRole(command: UserCommand<RoleChangeInput>): Promise<UserMutationResult> {
    return this.mutate(command, "USER_ROLE_CHANGED", async (transaction, current, now) => {
      if (command.id === command.actor.userId) throw new ForbiddenError();
      if (current.role === command.values.role) throw new ConflictError("Vai trò đã ở trạng thái yêu cầu.");
      if (current.role === "MANAGER") {
        const reports = await transaction.users.count({ where: { manager_id: current.id } });
        if (reports > 0) throw new ConflictError("Cần chuyển toàn bộ SALE trực thuộc trước khi đổi vai trò MANAGER.");
      }
      if (current.role === "ADMIN" && current.is_active) await this.assertAnotherActiveAdmin(transaction, current.id);
      const managerId = command.values.role === "SALE" ? current.manager_id : null;
      await this.assertManager(transaction, command.values.role, managerId);
      const updated = await transaction.users.update({ where: { id: command.id }, data: { role: command.values.role, manager_id: managerId, updated_at: now }, select: { id: true, role: true, is_active: true, updated_at: true } });
      await this.deleteSessions(transaction, command.id);
      return { updated, oldValues: { role: current.role }, newValues: { role: command.values.role }, metadata: { changedFields: ["role", ...(managerId !== current.manager_id ? ["managerId"] : [])] } };
    });
  }

  async assignManager(command: UserCommand<ManagerAssignmentInput>): Promise<UserMutationResult> {
    return this.mutate(command, "USER_MANAGER_ASSIGNED", async (transaction, current, now) => {
      if (current.role !== "SALE") throw new ConflictError("Chỉ SALE mới có quản lý trực tiếp.");
      if (current.manager_id === command.values.managerId) throw new ConflictError("Quản lý trực tiếp không thay đổi.");
      await this.assertManager(transaction, current.role, command.values.managerId);
      const updated = await transaction.users.update({ where: { id: command.id }, data: { manager_id: command.values.managerId, updated_at: now }, select: { id: true, role: true, is_active: true, updated_at: true } });
      return { updated, oldValues: { managerId: current.manager_id }, newValues: { managerId: command.values.managerId } };
    });
  }

  async transitionAccount(command: UserCommand<AccountTransitionInput> & { readonly targetStatus: UserAccountStatus }): Promise<UserMutationResult> {
    const action = command.targetStatus === "ACTIVE" ? "USER_ENABLED" : "USER_DISABLED";
    return this.mutate(command, action, async (transaction, current, now) => {
      const currentStatus = toUserAccountStatus(current.is_active);
      if (currentStatus === command.targetStatus) throw new ConflictError("Tài khoản đã ở trạng thái yêu cầu.");
      if (command.targetStatus === "DISABLED" && command.id === command.actor.userId) throw new ForbiddenError();
      if (command.targetStatus === "DISABLED" && current.role === "ADMIN") await this.assertAnotherActiveAdmin(transaction, current.id);
      const updated = await transaction.users.update({ where: { id: command.id }, data: { is_active: command.targetStatus === "ACTIVE", updated_at: now }, select: { id: true, role: true, is_active: true, updated_at: true } });
      if (command.targetStatus === "DISABLED") await this.deleteSessions(transaction, command.id);
      return { updated, oldValues: { status: currentStatus }, newValues: { status: command.targetStatus } };
    });
  }

  async unlockSecurity(command: UserCommand<AccountTransitionInput>): Promise<UserMutationResult> {
    return this.mutate(command, "USER_SECURITY_UNLOCKED", async (transaction, current, now) => {
      if (current.failed_login_attempts === 0 && current.locked_until === null) throw new ConflictError("Tài khoản không bị khóa bảo mật.");
      const updated = await transaction.users.update({ where: { id: command.id }, data: { failed_login_attempts: 0, locked_until: null, updated_at: now }, select: { id: true, role: true, is_active: true, updated_at: true } });
      return { updated, metadata: { changedFields: ["failedLoginAttempts", "lockedUntil"] } };
    });
  }

  async resetPassword(command: UserCommand<AccountTransitionInput> & { readonly passwordHash: string }): Promise<UserMutationResult> {
    return this.mutate(command, "USER_PASSWORD_RESET", async (transaction, _current, now) => {
      if (command.id === command.actor.userId) throw new ForbiddenError();
      const updated = await transaction.users.update({ where: { id: command.id }, data: { password_hash: command.passwordHash, password_changed_at: now, failed_login_attempts: 0, locked_until: null, updated_at: now }, select: { id: true, role: true, is_active: true, updated_at: true } });
      await this.deleteSessions(transaction, command.id);
      return { updated, metadata: { changedFields: ["password", "failedLoginAttempts", "lockedUntil"] } };
    });
  }

  async revokeSessions(command: UserCommand<AccountTransitionInput>): Promise<UserMutationResult> {
    return this.mutate(command, "USER_SESSIONS_REVOKED", async (transaction, current, now) => {
      const count = await this.deleteSessions(transaction, command.id);
      if (count === 0) throw new ConflictError("Tài khoản không có phiên đang hoạt động.");
      const updated = await transaction.users.update({ where: { id: command.id }, data: { updated_at: now }, select: { id: true, role: true, is_active: true, updated_at: true } });
      return { updated, metadata: { revokedSessionCount: count } };
    });
  }

  private async mutate(
    command: UserCommand<{ readonly expectedRole: UserRole; readonly expectedStatus: UserAccountStatus; readonly expectedUpdatedAt: string }>,
    action: string,
    operation: (transaction: Prisma.TransactionClient, current: LockedUser, now: Date) => Promise<{ updated: { id: string; role: UserRole; is_active: boolean; updated_at: Date }; oldValues?: Prisma.InputJsonValue; newValues?: Prisma.InputJsonValue; metadata?: Prisma.InputJsonValue }>,
  ): Promise<UserMutationResult> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${command.id}::uuid FOR UPDATE`;
      const current = await transaction.users.findUnique({ where: { id: command.id }, select: {
        id: true, role: true, manager_id: true, is_active: true, updated_at: true, failed_login_attempts: true,
        locked_until: true, full_name: true, username: true, email: true, phone: true,
      } });
      if (current === null) throw new NotFoundError("User");
      this.assertExpected(current, command.values);
      const outcome = await operation(
        transaction,
        current,
        new Date(Math.max(Date.now(), current.updated_at.getTime() + 1)),
      );
      await transaction.audit_logs.create({ data: {
        actor_id: command.actor.userId, action, entity_type: "users", entity_id: command.id,
        old_values: outcome.oldValues, new_values: outcome.newValues,
        metadata: { result: "success", requestId: command.context.requestId, actorRole: command.actor.role, ...(outcome.metadata && typeof outcome.metadata === "object" && !Array.isArray(outcome.metadata) ? outcome.metadata : {}) },
      } });
      return result(outcome.updated);
    }));
  }

  private assertExpected(current: Pick<LockedUser, "role" | "is_active" | "updated_at">, values: { expectedRole: UserRole; expectedStatus: UserAccountStatus; expectedUpdatedAt: string }): void {
    if (current.role !== values.expectedRole || toUserAccountStatus(current.is_active) !== values.expectedStatus || current.updated_at.getTime() !== new Date(values.expectedUpdatedAt).getTime()) {
      throw new ConflictError("Tài khoản đã được thay đổi. Vui lòng tải lại trang.");
    }
  }

  private async assertManager(transaction: Prisma.TransactionClient, role: UserRole, managerId: string | null): Promise<void> {
    if (role !== "SALE" && managerId !== null) throw new ConflictError("Chỉ SALE mới có quản lý trực tiếp.");
    if (managerId === null) return;
    const manager = await transaction.users.findFirst({ where: { id: managerId, role: "MANAGER", is_active: true }, select: { id: true } });
    if (manager === null) throw new ConflictError("Quản lý phải là MANAGER đang hoạt động.");
  }

  private async assertAnotherActiveAdmin(transaction: Prisma.TransactionClient, targetId: string): Promise<void> {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('users:last-active-admin'))::text`;
    const count = await transaction.users.count({ where: { role: "ADMIN", is_active: true, id: { not: targetId } } });
    if (count === 0) throw new ConflictError("Không thể vô hiệu hóa hoặc hạ quyền quản trị viên hoạt động cuối cùng.");
  }

  private deleteSessions(transaction: Prisma.TransactionClient, userId: string): Promise<number> {
    return transaction.$executeRaw`DELETE FROM app_sessions WHERE sess->>'userId' = ${userId}`;
  }
}
