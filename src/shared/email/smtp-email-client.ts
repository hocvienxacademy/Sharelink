import nodemailer from "nodemailer";
import type { TransactionalEmailSender } from "./transactional-email";
import {
  readSmtpConfiguration,
  type SmtpConfiguration,
} from "./smtp-configuration";

interface SmtpMailMessage {
  readonly from: {
    readonly name: string;
    readonly address: string;
  };
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly attachments: {
    readonly filename: string;
    readonly content: Buffer;
    readonly contentType: string;
  }[];
}

export interface SmtpMailTransport {
  sendMail(message: SmtpMailMessage): Promise<{ readonly messageId: string }>;
}

export function createSmtpEmailSenderFromTransport(
  configuration: SmtpConfiguration,
  transport: SmtpMailTransport,
): TransactionalEmailSender {
  return async (email) => {
    const result = await transport.sendMail({
      from: {
        name: configuration.fromName,
        address: configuration.fromEmail,
      },
      to: email.to,
      subject: email.subject,
      html: email.htmlContent,
      attachments: (email.attachments ?? []).map((attachment) => ({
        filename: attachment.name,
        content: Buffer.from(attachment.content),
        contentType: attachment.contentType ?? "application/octet-stream",
      })),
    });

    return { messageId: result.messageId };
  };
}

export function createSmtpEmailSender(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): TransactionalEmailSender {
  const configuration = readSmtpConfiguration(environment);
  const transport = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    requireTLS: configuration.requireTls,
    auth: {
      user: configuration.user,
      pass: configuration.password,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  return createSmtpEmailSenderFromTransport(configuration, transport);
}
