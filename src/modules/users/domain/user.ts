export const USER_ROLES = ["SALE", "MANAGER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ACCOUNT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type UserAccountStatus = (typeof USER_ACCOUNT_STATUSES)[number];

export function toUserAccountStatus(isActive: boolean): UserAccountStatus {
  return isActive ? "ACTIVE" : "DISABLED";
}

export interface CreatedUser {
  readonly id: string;
}
