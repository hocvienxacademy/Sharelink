import type { CreatedUser, UserRole } from "../../domain/user";

export interface CreateUserPersistenceInput {
  readonly actorId: string;
  readonly email: string;
  readonly fullName: string;
  readonly passwordHash: string;
  readonly phone: string | null;
  readonly role: UserRole;
}

export interface UserRepository {
  create(input: CreateUserPersistenceInput): Promise<CreatedUser>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
}
