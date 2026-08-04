import type { AuthenticatedActor } from "@/shared/authorization";
import type {
  BankAccountTransitionInput,
  CreateBankAccountInput,
  SetDefaultBankAccountInput,
  UpdateBankAccountInput,
} from "../validation/bank-account-management-schemas";

export interface ManagedBankAccount {
  readonly id: string;
  readonly bankCode: string;
  readonly bankName: string;
  readonly branchName: string | null;
  readonly accountNumber: string | null;
  readonly maskedAccountNumber: string;
  readonly accountName: string;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly updatedAt: Date;
}

export interface PublicBankAccount {
  readonly bankCode: string;
  readonly bankName: string;
  readonly branchName: string | null;
  readonly accountNumber: string;
  readonly accountName: string;
}

export interface BankAccountHistoryItem {
  readonly id: string;
  readonly action: string;
  readonly actorName: string | null;
  readonly occurredAt: Date;
}

export interface BankAccountMutationContext { readonly requestId: string }
export interface BankAccountCommand<T> {
  readonly actor: AuthenticatedActor;
  readonly context: BankAccountMutationContext;
  readonly id: string;
  readonly values: T;
}

export interface BankAccountManagementRepository {
  list(actor: AuthenticatedActor): Promise<readonly ManagedBankAccount[]>;
  find(actor: AuthenticatedActor, id: string): Promise<ManagedBankAccount | null>;
  findPublicDefault(): Promise<PublicBankAccount | null>;
  findHistory(id: string): Promise<readonly BankAccountHistoryItem[]>;
  create(actor: AuthenticatedActor, values: CreateBankAccountInput, context: BankAccountMutationContext): Promise<ManagedBankAccount>;
  update(command: BankAccountCommand<UpdateBankAccountInput>): Promise<ManagedBankAccount>;
  transition(command: BankAccountCommand<BankAccountTransitionInput> & { readonly active: boolean }): Promise<ManagedBankAccount>;
  setDefault(command: BankAccountCommand<SetDefaultBankAccountInput>): Promise<ManagedBankAccount>;
  clearDefault(command: BankAccountCommand<BankAccountTransitionInput>): Promise<ManagedBankAccount>;
}
