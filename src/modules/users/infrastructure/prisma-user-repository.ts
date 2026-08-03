import { ConflictError } from "@/shared/errors";
import {
  executePrismaOperation,
  prisma,
} from "@/shared/infrastructure/database/prisma";
import type { CreatedUser } from "../domain/user";
import type {
  CreateUserPersistenceInput,
  UserRepository,
} from "../application/ports/user-repository";

const createdUserSelect = {
  id: true,
} as const;

export class PrismaUserRepository implements UserRepository {
  async create(input: CreateUserPersistenceInput): Promise<CreatedUser> {
    return executePrismaOperation(() =>
      prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext(${`users:create:${input.username}`}))::text
        `;

        const existing = await transaction.users.findFirst({
          where: {
            OR: [
              { email: { equals: input.email, mode: "insensitive" } },
              { username: { equals: input.username, mode: "insensitive" } },
              ...(input.phone === null ? [] : [{ phone: input.phone }]),
            ],
          },
          select: { id: true },
        });
        if (existing !== null) {
          throw new ConflictError("Tên đăng nhập, email hoặc số điện thoại đã được sử dụng.");
        }

        const now = new Date();
        const user = await transaction.users.create({
          data: {
            username: input.username,
            full_name: input.fullName,
            email: input.email,
            phone: input.phone,
            password_hash: input.passwordHash,
            role: input.role,
            is_active: true,
            password_changed_at: now,
            updated_at: now,
          },
          select: createdUserSelect,
        });

        await transaction.audit_logs.create({
          data: {
            actor_id: input.actorId,
            action: "USER_CREATED",
            entity_type: "users",
            entity_id: user.id,
            new_values: { role: input.role, isActive: true },
          },
        });

        return { id: user.id };
      }),
    );
  }
}
