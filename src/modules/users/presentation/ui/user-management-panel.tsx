"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { describeApiError } from "@/shared/http/browser/json-api-client";
import type {
  UserDetail,
  UserListItem,
} from "../../application/ports/user-repository";
import { USER_ROLES, type UserRole } from "../../domain/user";
import {
  mutateAdminUser,
  type AdminUserOperation,
} from "./admin-user-api-client";
import {
  NativeSelect,
  OperationResultAlert,
  SectionCard,
  inlineFormClassName,
} from "./user-form-parts";
import { userSnapshot, versionOfResult, versionOfUser } from "./user-version";

const submitted =
  (handler: (form: FormData) => void) =>
  (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
  };

export function UserManagementPanel({
  user,
  managers,
}: {
  readonly user: UserDetail;
  readonly managers: readonly Pick<UserListItem, "id" | "fullName">[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(() => versionOfUser(user));
  const [role, setRole] = useState<UserRole>(user.role);
  const [managerId, setManagerId] = useState(user.managerId ?? "");
  const [assignedManagerId, setAssignedManagerId] = useState(
    user.managerId ?? "",
  );

  // Re-sync local state when router.refresh() delivers fresh server data.
  // Adjusting state during render avoids an extra effect-triggered render.
  const serverSnapshot = `${userSnapshot(user)}|${user.managerId ?? ""}`;
  const [syncedSnapshot, setSyncedSnapshot] = useState(serverSnapshot);
  if (syncedSnapshot !== serverSnapshot) {
    setSyncedSnapshot(serverSnapshot);
    setVersion(versionOfUser(user));
    setRole(user.role);
    setManagerId(user.managerId ?? "");
    setAssignedManagerId(user.managerId ?? "");
  }

  async function run(operation: AdminUserOperation, input: object) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await mutateAdminUser(user.id, operation, {
        ...version,
        ...input,
      });
      setVersion(versionOfResult(result));
      if (operation === "manager") setAssignedManagerId(managerId);
      router.refresh();
      setMessage("Thao tác đã hoàn tất.");
    } catch (error) {
      setMessage(describeApiError(error, "Không thể hoàn tất thao tác."));
    } finally {
      setBusy(false);
    }
  }

  const isActive = user.status === "ACTIVE";
  const hasSecurityLock =
    user.failedLoginAttempts !== 0 || user.lockedUntil !== null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="Cập nhật hồ sơ"
        description="Chỉ chỉnh sửa thông tin nhận diện; không thay đổi quyền hoặc trạng thái."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={submitted(
            (form) =>
              void run("profile", {
                fullName: form.get("fullName"),
                username: form.get("username"),
                email: form.get("email"),
                phone: form.get("phone"),
              }),
          )}
        >
          <FieldGroup className="grid md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fullName">Họ và tên</FieldLabel>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={user.fullName}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="username">Tên đăng nhập</FieldLabel>
              <Input
                id="username"
                name="username"
                defaultValue={user.username}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email ?? ""}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Điện thoại</FieldLabel>
              <Input id="phone" name="phone" defaultValue={user.phone ?? ""} />
            </Field>
          </FieldGroup>
          <Button className="w-full sm:w-fit" disabled={busy} type="submit">
            Lưu hồ sơ
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        title="Vai trò và quản lý"
        description="Đổi vai trò sẽ thu hồi toàn bộ phiên đăng nhập của tài khoản."
        contentClassName="flex flex-col gap-5"
      >
        <form
          className={inlineFormClassName}
          onSubmit={submitted(() => void run("role", { role }))}
        >
          <Field className="flex-1">
            <FieldLabel htmlFor="role">Vai trò</FieldLabel>
            <NativeSelect
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              {USER_ROLES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </NativeSelect>
          </Field>
          <Button
            className="w-full sm:w-auto"
            disabled={busy || role === version.expectedRole}
          >
            Đổi vai trò
          </Button>
        </form>
        {version.expectedRole === "SALE" && (
          <form
            className={inlineFormClassName}
            onSubmit={submitted(
              () =>
                void run("manager", {
                  managerId: managerId === "" ? null : managerId,
                }),
            )}
          >
            <Field className="flex-1">
              <FieldLabel htmlFor="managerId">Quản lý trực tiếp</FieldLabel>
              <NativeSelect
                id="managerId"
                name="managerId"
                value={managerId}
                onChange={(event) => setManagerId(event.target.value)}
              >
                <option value="">Chưa phân công</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Button
              className="w-full sm:w-auto"
              disabled={busy || managerId === assignedManagerId}
            >
              Phân công
            </Button>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="Vòng đời và bảo mật"
        description="Khóa bảo mật tạm thời độc lập với trạng thái ACTIVE/DISABLED."
        contentClassName="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap"
      >
        <Button
          className="w-full sm:w-auto"
          disabled={busy}
          variant={isActive ? "destructive" : "default"}
          onClick={() => void run(isActive ? "disable" : "enable", {})}
        >
          {isActive ? "Vô hiệu hóa" : "Kích hoạt"}
        </Button>
        <Button
          className="w-full sm:w-auto"
          disabled={busy || !hasSecurityLock}
          variant="outline"
          onClick={() => void run("unlock-security", {})}
        >
          Mở khóa bảo mật
        </Button>
        <Button
          className="w-full sm:w-auto"
          disabled={busy}
          variant="outline"
          onClick={() => void run("revoke-sessions", {})}
        >
          Thu hồi mọi phiên
        </Button>
      </SectionCard>

      <SectionCard
        title="Đặt lại mật khẩu"
        description="Thao tác mở khóa bảo mật và thu hồi mọi phiên của người dùng."
      >
        <form
          className={inlineFormClassName}
          onSubmit={submitted(
            (form) =>
              void run("reset-password", { password: form.get("password") }),
          )}
        >
          <Field className="flex-1">
            <FieldLabel htmlFor="password">Mật khẩu mới</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Button className="w-full sm:w-auto" disabled={busy}>
            Đặt lại
          </Button>
        </form>
      </SectionCard>

      <OperationResultAlert message={message} />
    </div>
  );
}
