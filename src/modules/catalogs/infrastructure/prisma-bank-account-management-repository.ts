import type { Prisma } from "@/generated/prisma/client";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { executePrismaOperation, prisma } from "@/shared/infrastructure/database/prisma";
import { maskSensitiveValue } from "@/shared/security/mask-sensitive-value";
import type {
  BankAccountCommand,
  BankAccountHistoryItem,
  BankAccountManagementRepository,
  BankAccountMutationContext,
  ManagedBankAccount,
  PublicBankAccount,
} from "../application/ports/bank-account-management-repository";
import type {
  BankAccountTransitionInput,
  CreateBankAccountInput,
  SetDefaultBankAccountInput,
  UpdateBankAccountInput,
} from "../application/validation/bank-account-management-schemas";

const bankAccountSelect = {
  id: true, bank_code: true, bank_name: true, branch_name: true,
  account_number: true, account_name: true, is_default: true,
  is_active: true, updated_at: true,
} as const;

type BankAccountRow = {
  id: string; bank_code: string; bank_name: string; branch_name: string | null;
  account_number: string; account_name: string; is_default: boolean;
  is_active: boolean; updated_at: Date;
};

const nextTimestamp = (current: Date) => new Date(Math.max(Date.now(), current.getTime() + 1));
const mapAccount = (row: BankAccountRow, reveal: boolean): ManagedBankAccount => ({
  id: row.id,
  bankCode: row.bank_code,
  bankName: row.bank_name,
  branchName: row.branch_name,
  accountNumber: reveal ? row.account_number : null,
  maskedAccountNumber: maskSensitiveValue(row.account_number),
  accountName: row.account_name,
  isDefault: row.is_default,
  isActive: row.is_active,
  updatedAt: row.updated_at,
});

export class PrismaBankAccountManagementRepository implements BankAccountManagementRepository {
  async list(actor: AuthenticatedActor): Promise<readonly ManagedBankAccount[]> {
    const rows = await executePrismaOperation(() => prisma.bank_accounts.findMany({
      where: actor.role === "SALE" ? { is_active: true } : undefined,
      orderBy: [{ is_default: "desc" }, { bank_code: "asc" }, { bank_name: "asc" }, { id: "asc" }],
      select: bankAccountSelect,
    }));
    return rows.map((row) => mapAccount(row, actor.role === "ADMIN"));
  }

  async find(actor: AuthenticatedActor, id: string): Promise<ManagedBankAccount | null> {
    const row = await executePrismaOperation(() => prisma.bank_accounts.findFirst({
      where: { id, ...(actor.role === "SALE" ? { is_active: true } : {}) },
      select: bankAccountSelect,
    }));
    return row === null ? null : mapAccount(row, actor.role === "ADMIN");
  }

  async findPublicDefault(): Promise<PublicBankAccount | null> {
    const row = await executePrismaOperation(() => prisma.bank_accounts.findFirst({
      where: { is_active: true, is_default: true },
      select: { bank_code: true, bank_name: true, branch_name: true, account_number: true, account_name: true },
    }));
    return row === null ? null : {
      bankCode: row.bank_code,
      bankName: row.bank_name,
      branchName: row.branch_name,
      accountNumber: row.account_number,
      accountName: row.account_name,
    };
  }

  async findHistory(id: string): Promise<readonly BankAccountHistoryItem[]> {
    const rows = await executePrismaOperation(() => prisma.audit_logs.findMany({
      where: { entity_type: "bank_accounts", entity_id: id },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: 100,
      select: { id: true, action: true, created_at: true, users: { select: { full_name: true } } },
    }));
    return rows.map((row) => ({ id: row.id, action: row.action, actorName: row.users?.full_name ?? null, occurredAt: row.created_at }));
  }

  async create(actor: AuthenticatedActor, values: CreateBankAccountInput, context: BankAccountMutationContext): Promise<ManagedBankAccount> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      const now = new Date();
      const row = await transaction.bank_accounts.create({
        data: {
          bank_code: values.bankCode,
          bank_name: values.bankName,
          branch_name: values.branchName ?? null,
          account_number: values.accountNumber,
          account_name: values.accountName,
          is_active: false,
          is_default: false,
          created_at: now,
          updated_at: now,
        },
        select: bankAccountSelect,
      });
      await this.audit(transaction, actor, context, "BANK_ACCOUNT_CREATED", row.id, undefined, { status: "INACTIVE", isDefault: false });
      return mapAccount(row, true);
    }));
  }

  async update(command: BankAccountCommand<UpdateBankAccountInput>): Promise<ManagedBankAccount> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      const current = await this.lock(transaction, command.id);
      this.assertVersion(current.updated_at, command.values.expectedUpdatedAt);
      const bankCodeChanged = command.values.bankCode !== undefined && command.values.bankCode !== current.bank_code;
      const accountNumberChanged = command.values.accountNumber !== undefined && command.values.accountNumber !== current.account_number;
      if ((bankCodeChanged || accountNumberChanged) && await transaction.payment_confirmations.count({ where: { bank_account_id: command.id } }) > 0) {
        throw new ConflictError("Tài khoản đã được dùng để xác nhận thanh toán; không thể đổi mã ngân hàng hoặc số tài khoản.");
      }
      const changedFields = [
        bankCodeChanged ? "bankCode" : null,
        command.values.bankName !== undefined && command.values.bankName !== current.bank_name ? "bankName" : null,
        command.values.branchName !== undefined && command.values.branchName !== current.branch_name ? "branchName" : null,
        accountNumberChanged ? "accountNumber" : null,
        command.values.accountName !== undefined && command.values.accountName !== current.account_name ? "accountName" : null,
      ].filter((value): value is string => value !== null);
      if (changedFields.length === 0) throw new ConflictError("Thông tin tài khoản ngân hàng không thay đổi.");
      const row = await transaction.bank_accounts.update({
        where: { id: command.id },
        data: {
          ...(command.values.bankCode === undefined ? {} : { bank_code: command.values.bankCode }),
          ...(command.values.bankName === undefined ? {} : { bank_name: command.values.bankName }),
          ...(command.values.branchName === undefined ? {} : { branch_name: command.values.branchName }),
          ...(command.values.accountNumber === undefined ? {} : { account_number: command.values.accountNumber }),
          ...(command.values.accountName === undefined ? {} : { account_name: command.values.accountName }),
          updated_at: nextTimestamp(current.updated_at),
        },
        select: bankAccountSelect,
      });
      await this.audit(transaction, command.actor, command.context, "BANK_ACCOUNT_UPDATED", row.id, undefined, undefined, { changedFields });
      return mapAccount(row, true);
    }));
  }

  async transition(command: BankAccountCommand<BankAccountTransitionInput> & { readonly active: boolean }): Promise<ManagedBankAccount> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await this.lockDefault(transaction);
      const current = await this.lock(transaction, command.id);
      this.assertVersion(current.updated_at, command.values.expectedUpdatedAt);
      if (current.is_active === command.active) throw new ConflictError("Tài khoản ngân hàng đã ở trạng thái yêu cầu.");
      if (!command.active && current.is_default) throw new ConflictError("Không thể tạm dừng tài khoản mặc định.");
      const row = await transaction.bank_accounts.update({
        where: { id: command.id },
        data: { is_active: command.active, updated_at: nextTimestamp(current.updated_at) },
        select: bankAccountSelect,
      });
      await this.audit(
        transaction,
        command.actor,
        command.context,
        command.active ? "BANK_ACCOUNT_ACTIVATED" : "BANK_ACCOUNT_DEACTIVATED",
        row.id,
        { status: command.active ? "INACTIVE" : "ACTIVE" },
        { status: command.active ? "ACTIVE" : "INACTIVE" },
      );
      return mapAccount(row, true);
    }));
  }

  async setDefault(command: BankAccountCommand<SetDefaultBankAccountInput>): Promise<ManagedBankAccount> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await this.lockDefault(transaction);
      const currentDefault = await transaction.bank_accounts.findFirst({ where: { is_default: true }, select: { id: true, updated_at: true } });
      if ((currentDefault?.id ?? null) !== command.values.expectedCurrentDefaultId) {
        throw new ConflictError("Tài khoản mặc định đã thay đổi. Vui lòng tải lại trang.");
      }
      const target = await this.lock(transaction, command.id);
      this.assertVersion(target.updated_at, command.values.expectedUpdatedAt);
      if (!target.is_active) throw new ConflictError("Chỉ tài khoản đang hoạt động mới có thể được đặt làm mặc định.");
      if (target.is_default) throw new ConflictError("Tài khoản này đã là mặc định.");
      const now = nextTimestamp(target.updated_at);
      if (currentDefault !== null) {
        await transaction.bank_accounts.update({
          where: { id: currentDefault.id },
          data: { is_default: false, updated_at: nextTimestamp(currentDefault.updated_at) },
        });
      }
      const row = await transaction.bank_accounts.update({
        where: { id: command.id },
        data: { is_default: true, updated_at: now },
        select: bankAccountSelect,
      });
      await this.audit(transaction, command.actor, command.context, "BANK_ACCOUNT_DEFAULT_CHANGED", row.id, undefined, { isDefault: true }, {
        previousDefaultId: currentDefault?.id ?? null,
        newDefaultId: row.id,
      });
      return mapAccount(row, true);
    }));
  }

  async clearDefault(command: BankAccountCommand<BankAccountTransitionInput>): Promise<ManagedBankAccount> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      await this.lockDefault(transaction);
      const current = await this.lock(transaction, command.id);
      this.assertVersion(current.updated_at, command.values.expectedUpdatedAt);
      if (!current.is_default) throw new ConflictError("Tài khoản này không phải tài khoản mặc định.");
      const row = await transaction.bank_accounts.update({
        where: { id: command.id },
        data: { is_default: false, updated_at: nextTimestamp(current.updated_at) },
        select: bankAccountSelect,
      });
      await this.audit(transaction, command.actor, command.context, "BANK_ACCOUNT_DEFAULT_CLEARED", row.id, { isDefault: true }, { isDefault: false });
      return mapAccount(row, true);
    }));
  }

  private async lock(transaction: Prisma.TransactionClient, id: string): Promise<BankAccountRow> {
    const rows = await transaction.$queryRaw<BankAccountRow[]>`
      SELECT id, bank_code, bank_name, branch_name, account_number, account_name,
             is_default, is_active, updated_at
      FROM bank_accounts WHERE id=${id}::uuid FOR UPDATE`;
    if (rows[0] === undefined) throw new NotFoundError("Bank account");
    return rows[0];
  }

  private lockDefault(transaction: Prisma.TransactionClient) {
    return transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('bank-accounts:default'))::text`;
  }

  private assertVersion(current: Date, expected: string): void {
    if (current.getTime() !== new Date(expected).getTime()) throw new ConflictError("Dữ liệu đã thay đổi. Vui lòng tải lại trang.");
  }

  private audit(
    transaction: Prisma.TransactionClient,
    actor: AuthenticatedActor,
    context: BankAccountMutationContext,
    action: string,
    entityId: string,
    oldValues?: Prisma.InputJsonValue,
    newValues?: Prisma.InputJsonValue,
    metadata?: Prisma.InputJsonValue,
  ) {
    return transaction.audit_logs.create({ data: {
      actor_id: actor.userId,
      action,
      entity_type: "bank_accounts",
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      metadata: {
        result: "success",
        requestId: context.requestId,
        actorRole: actor.role,
        ...(metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}),
      },
    } });
  }
}
