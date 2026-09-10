export interface TransactionalEmail {
  readonly to: string;
  readonly subject: string;
  readonly htmlContent: string;
  readonly attachments?: readonly EmailAttachment[];
}

export interface EmailAttachment {
  readonly content: Uint8Array;
  readonly name: string;
  readonly contentType?: string;
}

export interface SentEmail {
  readonly messageId: string;
}

export type TransactionalEmailSender = (
  email: TransactionalEmail,
) => Promise<SentEmail>;
