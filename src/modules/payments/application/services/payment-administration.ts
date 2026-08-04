import type { AuthenticatedActor } from "@/shared/authorization";
import { NotFoundError } from "@/shared/errors";
import type { Clock } from "@/shared/time";
import { systemClock } from "@/shared/time";
import { PaymentAuthorizationPolicy, assertPaymentAuthorized } from "../authorization/payment-authorization";
import type { PaymentMutationResult } from "../dto/payment-dto";
import type { PaymentMutationRepository, PaymentQueryRepository } from "../ports/payment-repositories";
import { parseCancelPayment, parseConfirmPayment } from "../validation/payment-schemas";

export class PaymentAdministration {
  constructor(
    private readonly queries: PaymentQueryRepository,
    private readonly repository: PaymentMutationRepository,
    private readonly policy = new PaymentAuthorizationPolicy(),
    private readonly clock: Clock = systemClock,
  ) {}

  async confirm(actor: AuthenticatedActor, applicationId: string, input: unknown, requestId: string): Promise<PaymentMutationResult> {
    const resource = await this.queries.findAuthorizationResourceByApplicationId(applicationId);
    if (resource === null) throw new NotFoundError("Payment confirmation");
    assertPaymentAuthorized(this.policy, "payment.confirm", actor, resource);
    const values = parseConfirmPayment(input);
    return this.repository.confirm({
      actor,
      applicationId,
      confirmationNote: values.confirmationNote,
      expectedStatus: values.expectedStatus,
      expectedUpdatedAt: new Date(values.expectedUpdatedAt),
      occurredAt: this.clock.now(),
      requestId,
    });
  }

  async cancel(actor: AuthenticatedActor, applicationId: string, input: unknown, requestId: string): Promise<PaymentMutationResult> {
    const resource = await this.queries.findAuthorizationResourceByApplicationId(applicationId);
    if (resource === null) throw new NotFoundError("Payment confirmation");
    assertPaymentAuthorized(this.policy, "payment.cancelConfirmation", actor, resource);
    const values = parseCancelPayment(input);
    return this.repository.cancel({
      actor,
      applicationId,
      expectedStatus: values.expectedStatus,
      expectedUpdatedAt: new Date(values.expectedUpdatedAt),
      occurredAt: this.clock.now(),
      reason: values.reason,
      requestId,
    });
  }
}
