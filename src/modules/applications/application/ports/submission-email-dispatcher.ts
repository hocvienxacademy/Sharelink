import type { SubmissionEmailStatus } from "../../domain/application";

export interface SubmissionEmailDispatchResult {
  readonly status: Extract<SubmissionEmailStatus, "PENDING" | "SENT">;
}

/**
 * Dispatches the post-submission email. A future outbox adapter can return
 * PENDING after durable enqueueing; a synchronous transport returns SENT.
 */
export interface SubmissionEmailDispatcher {
  dispatch(applicationId: string): Promise<SubmissionEmailDispatchResult>;
}
