import type { AuthenticatedActor } from "@/shared/authorization";
import { PaymentAuthorizationPolicy, assertPaymentAuthorized } from "../authorization/payment-authorization";
import type { PaymentHistory, StaffPaymentDetail, StaffPaymentListItem } from "../dto/payment-dto";
import type { PaymentQueryRepository, PaymentQueryScope } from "../ports/payment-repositories";

const scopeFor = (actor: AuthenticatedActor): PaymentQueryScope => actor.role === "ADMIN"
  ? { kind: "all" }
  : actor.role === "SALE"
    ? { kind: "sale", saleId: actor.userId }
    : { kind: "manager", managerId: actor.userId };

export class QueryPayments {
  constructor(private readonly repository: PaymentQueryRepository, private readonly policy = new PaymentAuthorizationPolicy()) {}

  async list(actor: AuthenticatedActor): Promise<readonly StaffPaymentListItem[]> {
    assertPaymentAuthorized(this.policy, "payment.list", actor);
    return this.repository.list(scopeFor(actor));
  }

  async detailByApplicationId(actor: AuthenticatedActor, applicationId: string): Promise<StaffPaymentDetail | null> {
    const resource = await this.repository.findAuthorizationResourceByApplicationId(applicationId);
    if (resource === null || !this.policy.authorize("payment.read", actor, resource).allowed) return null;
    return this.repository.findDetailByApplicationId(applicationId, scopeFor(actor));
  }

  async detailByPaymentId(actor: AuthenticatedActor, paymentId: string): Promise<StaffPaymentDetail | null> {
    const resource = await this.repository.findAuthorizationResourceByPaymentId(paymentId);
    if (resource === null || !this.policy.authorize("payment.read", actor, resource).allowed) return null;
    return this.repository.findDetailByPaymentId(paymentId, scopeFor(actor));
  }

  async history(actor: AuthenticatedActor, applicationId: string): Promise<PaymentHistory | null> {
    const resource = await this.repository.findAuthorizationResourceByApplicationId(applicationId);
    if (resource === null || !this.policy.authorize("payment.viewHistory", actor, resource).allowed) return null;
    return this.repository.findHistoryByApplicationId(applicationId, scopeFor(actor));
  }
}

