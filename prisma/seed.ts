import { config as loadEnv } from "dotenv";
import { validateDevelopmentEnvironment } from "../src/shared/config/runtime-environment";
import { hashPassword } from "../src/modules/auth/infrastructure/security/password";

loadEnv({ path: ".env", override: false, quiet: true });
loadEnv({ path: ".env.local", override: true, quiet: true });
validateDevelopmentEnvironment(process.env);

const username = process.env.LOCAL_ADMIN_USERNAME?.trim().toLowerCase();
const email = process.env.LOCAL_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.LOCAL_ADMIN_PASSWORD;

if (!username || !email || !password) {
  throw new Error(
    "LOCAL_ADMIN_USERNAME, LOCAL_ADMIN_EMAIL and LOCAL_ADMIN_PASSWORD are required.",
  );
}

if (username.length > 100 || email.length > 255 || password.length > 128) {
  throw new Error("Local admin credentials exceed the supported length.");
}

const { prisma } = await import(
  "../src/shared/infrastructure/database/prisma/prisma-client"
);
const existing = await prisma.users.findMany({
  where: {
    OR: [
      { username: { equals: username, mode: "insensitive" } },
      { email: { equals: email, mode: "insensitive" } },
    ],
  },
  select: { id: true },
  take: 2,
});

if (existing.length > 1) {
  throw new Error("Configured local admin username and email belong to different records.");
}

const now = new Date();
const passwordHash = await hashPassword(password);

if (existing.length === 1) {
  await prisma.$transaction([
    prisma.users.update({
      where: { id: existing[0].id },
      data: {
        username,
        full_name: "Quản trị viên Local",
        email,
        password_hash: passwordHash,
        role: "ADMIN",
        is_active: true,
        failed_login_attempts: 0,
        locked_until: null,
        password_changed_at: now,
        updated_at: now,
      },
    }),
    prisma.app_sessions.deleteMany({
      where: {
        sess: { path: ["userId"], equals: existing[0].id },
      },
    }),
  ]);
} else {
  await prisma.users.create({
    data: {
      username,
      full_name: "Quản trị viên Local",
      email,
      password_hash: passwordHash,
      role: "ADMIN",
      is_active: true,
      password_changed_at: now,
      updated_at: now,
    },
  });
}

await prisma.app_sessions.deleteMany({ where: { expire: { lte: now } } });
await prisma.$disconnect();

console.log("Local ADMIN account is ready.");
