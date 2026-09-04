import { hashPassword, verifyPassword } from "@/modules/auth/infrastructure/security/password";
import { CreateUser, QueryUsers, UserAdministrationService } from "@/modules/users";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user-repository";

export const userRepository = new PrismaUserRepository();
export const createUser = new CreateUser(userRepository, {
  hash: hashPassword,
});
export const userAdministration = new UserAdministrationService(
  userRepository,
  { hash: hashPassword },
  { verify: verifyPassword },
);
export const queryUsers = new QueryUsers(userRepository);
