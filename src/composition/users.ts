import { hashPassword } from "@/modules/auth/infrastructure/security/password";
import { CreateUser } from "@/modules/users";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user-repository";

export const userRepository = new PrismaUserRepository();
export const createUser = new CreateUser(userRepository, {
  hash: hashPassword,
});
