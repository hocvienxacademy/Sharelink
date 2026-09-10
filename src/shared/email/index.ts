export {
  type EmailAttachment,
  type SentEmail,
  type TransactionalEmail,
  type TransactionalEmailSender,
} from "./transactional-email";
export {
  createSmtpEmailSender,
  createSmtpEmailSenderFromTransport,
  type SmtpMailTransport,
} from "./smtp-email-client";
export {
  readSmtpConfiguration,
  validateSmtpEnvironment,
  type SmtpConfiguration,
} from "./smtp-configuration";
