import type { AuthenticatedActor } from "@/shared/authorization";
import { NotFoundError } from "@/shared/errors";
import { assertBankAccountAuthorized, BankAccountAuthorizationPolicy } from "../authorization/bank-account-authorization";
import type { BankAccountManagementRepository, BankAccountMutationContext } from "../ports/bank-account-management-repository";
import {
  parseBankAccountTransition,
  parseCreateBankAccount,
  parseSetDefaultBankAccount,
  parseUpdateBankAccount,
} from "../validation/bank-account-management-schemas";

export class QueryManagedBankAccounts {
  constructor(
    private readonly repository: BankAccountManagementRepository,
    private readonly policy = new BankAccountAuthorizationPolicy(),
  ) {}

  async list(actor: AuthenticatedActor) {
    assertBankAccountAuthorized(this.policy, "bankAccount.list", actor);
    return this.repository.list(actor);
  }

  async find(actor: AuthenticatedActor, id: string) {
    assertBankAccountAuthorized(this.policy, "bankAccount.read", actor);
    return this.repository.find(actor, id);
  }

  async history(actor: AuthenticatedActor, id: string) {
    assertBankAccountAuthorized(this.policy, "bankAccount.viewHistory", actor);
    if (await this.repository.find(actor, id) === null) throw new NotFoundError("Bank account");
    return this.repository.findHistory(id);
  }
}

export class BankAccountAdministrationService {
  constructor(
    private readonly repository: BankAccountManagementRepository,
    private readonly policy = new BankAccountAuthorizationPolicy(),
  ) {}

  async create(actor: AuthenticatedActor, input: unknown, context: BankAccountMutationContext) {
    assertBankAccountAuthorized(this.policy, "bankAccount.create", actor);
    return this.repository.create(actor, parseCreateBankAccount(input), context);
  }

  async update(actor: AuthenticatedActor, id: string, input: unknown, context: BankAccountMutationContext) {
    assertBankAccountAuthorized(this.policy, "bankAccount.update", actor);
    return this.repository.update({ actor, id, values: parseUpdateBankAccount(input), context });
  }

  async transition(actor: AuthenticatedActor, id: string, active: boolean, input: unknown, context: BankAccountMutationContext) {
    assertBankAccountAuthorized(this.policy, active ? "bankAccount.activate" : "bankAccount.deactivate", actor);
    return this.repository.transition({ actor, id, active, values: parseBankAccountTransition(input), context });
  }

  async setDefault(actor: AuthenticatedActor, id: string, input: unknown, context: BankAccountMutationContext) {
    assertBankAccountAuthorized(this.policy, "bankAccount.setDefault", actor);
    return this.repository.setDefault({ actor, id, values: parseSetDefaultBankAccount(input), context });
  }

  async clearDefault(actor: AuthenticatedActor, id: string, input: unknown, context: BankAccountMutationContext) {
    assertBankAccountAuthorized(this.policy, "bankAccount.clearDefault", actor);
    return this.repository.clearDefault({ actor, id, values: parseBankAccountTransition(input), context });
  }
}
