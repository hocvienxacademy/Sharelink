import type { AuthenticatedActor } from "@/shared/authorization";
import type { CreatedUser, UserAccountStatus, UserRole } from "../../domain/user";
import type { UserAuthorizationResource } from "../authorization/user-authorization";
import type { AccountTransitionInput, ManagerAssignmentInput, ProfileUpdateInput, RoleChangeInput } from "../validation/user-management-schemas";

export interface CreateUserPersistenceInput {
  readonly actorId: string; readonly email: string; readonly fullName: string; readonly passwordHash: string;
  readonly phone: string | null; readonly role: UserRole; readonly username: string; readonly managerId: string | null;
}
export interface UserMutationContext { readonly requestId: string }
export interface UserMutationResult { readonly id: string; readonly role: UserRole; readonly status: UserAccountStatus; readonly updatedAt: Date }
export interface UserCommand<T> { readonly actor: AuthenticatedActor; readonly context: UserMutationContext; readonly id: string; readonly values: T }
export interface UserListItem {
  readonly id: string; readonly username: string; readonly fullName: string; readonly role: UserRole;
  readonly status: UserAccountStatus; readonly managerName: string | null; readonly updatedAt: Date;
}
export interface UserDetail extends UserListItem {
  readonly email: string | null; readonly phone: string | null; readonly lastLoginAt: Date | null;
  readonly failedLoginAttempts: number | null; readonly lockedUntil: Date | null;
  readonly passwordChangedAt: Date | null; readonly createdAt: Date | null; readonly managerId: string | null;
}
export interface UserHistoryItem { readonly id: string; readonly action: string; readonly actorName: string | null; readonly occurredAt: Date }

export interface UserRepository {
  create(input: CreateUserPersistenceInput): Promise<CreatedUser>;
}
export interface UserManagementRepository extends UserRepository {
  findAuthorizationResource(id: string): Promise<UserAuthorizationResource | null>;
  list(actor: AuthenticatedActor): Promise<readonly UserListItem[]>;
  findDetail(actor: AuthenticatedActor, id: string): Promise<UserDetail | null>;
  findHistory(actor: AuthenticatedActor, id: string): Promise<readonly UserHistoryItem[] | null>;
  updateProfile(command: UserCommand<ProfileUpdateInput>): Promise<UserMutationResult>;
  changeRole(command: UserCommand<RoleChangeInput>): Promise<UserMutationResult>;
  assignManager(command: UserCommand<ManagerAssignmentInput>): Promise<UserMutationResult>;
  transitionAccount(command: UserCommand<AccountTransitionInput> & { readonly targetStatus: UserAccountStatus }): Promise<UserMutationResult>;
  unlockSecurity(command: UserCommand<AccountTransitionInput>): Promise<UserMutationResult>;
  resetPassword(command: UserCommand<AccountTransitionInput> & { readonly passwordHash: string }): Promise<UserMutationResult>;
  revokeSessions(command: UserCommand<AccountTransitionInput>): Promise<UserMutationResult>;
}
export interface PasswordHasher { hash(password: string): Promise<string> }
