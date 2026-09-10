export interface SmtpConfiguration {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly requireTls: boolean;
  readonly user: string;
  readonly password: string;
  readonly fromName: string;
  readonly fromEmail: string;
}

function required(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseBoolean(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
): boolean {
  const value = required(environment, name).toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be either true or false.`);
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
  }
  return port;
}

function assertEmail(value: string, name: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${name} must be a valid email address.`);
  }
}

export function readSmtpConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SmtpConfiguration {
  const host = required(environment, "SMTP_HOST");
  const port = parsePort(required(environment, "SMTP_PORT"));
  const secure = parseBoolean(environment, "SMTP_SECURE");
  const requireTls = parseBoolean(environment, "SMTP_REQUIRE_TLS");
  const user = required(environment, "SMTP_USER");
  const password = required(environment, "SMTP_PASSWORD");
  const fromName = required(environment, "SMTP_FROM_NAME");
  const fromEmail = required(environment, "SMTP_FROM_EMAIL");

  if (host.includes("://") || /\s/.test(host)) {
    throw new Error("SMTP_HOST must be a hostname without a URL scheme.");
  }
  assertEmail(user, "SMTP_USER");
  assertEmail(fromEmail, "SMTP_FROM_EMAIL");

  if (host.toLowerCase() === "smtp.gmail.com") {
    if (port !== 587 || secure || !requireTls) {
      throw new Error(
        "Google SMTP requires SMTP_PORT=587, SMTP_SECURE=false, and SMTP_REQUIRE_TLS=true.",
      );
    }
    if (user.toLowerCase() !== fromEmail.toLowerCase()) {
      throw new Error(
        "SMTP_FROM_EMAIL must match SMTP_USER when using Google SMTP.",
      );
    }
  }

  return {
    host,
    port,
    secure,
    requireTls,
    user,
    password,
    fromName,
    fromEmail,
  };
}

export function validateSmtpEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  readSmtpConfiguration(environment);
}
