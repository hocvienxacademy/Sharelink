import { validateRuntimeEnvironment } from "../src/shared/config/runtime-environment";
import { hashPassword } from "../src/modules/auth/infrastructure/security/password";
import { parseCreateUserInput } from "../src/modules/users/application/validation/create-user-schema";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function bootstrapProductionAdmin(): Promise<void> {
  if (process.env.RENDER !== "true") {
    throw new Error("Production ADMIN bootstrap is restricted to Render.");
  }
  validateRuntimeEnvironment(process.env);

  const input = parseCreateUserInput({
    fullName: required("BOOTSTRAP_ADMIN_FULL_NAME"),
    username: required("BOOTSTRAP_ADMIN_USERNAME"),
    email: required("BOOTSTRAP_ADMIN_EMAIL"),
    phone: null,
    role: "ADMIN",
    managerId: null,
    password: required("BOOTSTRAP_ADMIN_PASSWORD"),
  });
  const passwordHash = await hashPassword(input.password);
  const { prisma } = await import(
    "../src/shared/infrastructure/database/prisma/prisma-client"
  );

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtext('users:bootstrap-production-admin')
        )::text
      `;
      const adminCount = await transaction.users.count({
        where: { role: "ADMIN" },
      });
      if (adminCount > 0) {
        throw new Error("A production ADMIN account already exists.");
      }
      const conflictingIdentity = await transaction.users.findFirst({
        where: {
          OR: [
            { username: { equals: input.username, mode: "insensitive" } },
            { email: { equals: input.email, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      if (conflictingIdentity !== null) {
        throw new Error("The configured bootstrap identity is already in use.");
      }

      const now = new Date();
      const user = await transaction.users.create({
        data: {
          username: input.username,
          full_name: input.fullName,
          email: input.email,
          phone: null,
          password_hash: passwordHash,
          role: "ADMIN",
          manager_id: null,
          is_active: true,
          password_changed_at: now,
          updated_at: now,
        },
        select: { id: true },
      });
      await transaction.audit_logs.create({
        data: {
          actor_id: null,
          action: "INITIAL_ADMIN_BOOTSTRAPPED",
          entity_type: "users",
          entity_id: user.id,
          new_values: { role: "ADMIN", status: "ACTIVE" },
          metadata: { source: "render-production-bootstrap" },
        },
      });
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log("Production ADMIN account is ready.");
}

try {
  await bootstrapProductionAdmin();
} catch {
  console.error(
    "Production ADMIN bootstrap failed. Review the deployment configuration securely.",
  );
  process.exitCode = 1;
}
