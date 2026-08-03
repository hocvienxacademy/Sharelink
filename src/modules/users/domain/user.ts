export const USER_ROLES = ["SALE", "MANAGER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface CreatedUser {
  readonly id: string;
}
