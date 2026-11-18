"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { describeApiError } from "@/shared/http/browser/json-api-client";
import type { UserDetail } from "../../application/ports/user-repository";
import { mutateStaffAccount } from "./staff-account-api-client";
import { OperationResultAlert, SectionCard } from "./user-form-parts";
import { userSnapshot, versionOfResult, versionOfUser } from "./user-version";

const formText = (form: FormData, name: string) => String(form.get(name) ?? "");

export function StaffAccountPanel({ user }: { readonly user: UserDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(() => versionOfUser(user));
  const isAdmin = user.role === "ADMIN";

  // Re-sync the concurrency token when router.refresh() delivers fresh data.
  const serverSnapshot = userSnapshot(user);
  const [syncedSnapshot, setSyncedSnapshot] = useState(serverSnapshot);
  if (syncedSnapshot !== serverSnapshot) {
    setSyncedSnapshot(serverSnapshot);
    setVersion(versionOfUser(user));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      const result = await mutateStaffAccount("profile", {
        ...version,
        fullName: form.get("fullName"),
        ...(isAdmin ? { username: form.get("username") } : {}),
        email: form.get("email"),
        phone: form.get("phone"),
      });
      setVersion(versionOfResult(result));
      setMessage("Thông tin tài khoản đã được cập nhật.");
      router.refresh();
    } catch (error) {
      setMessage(describeApiError(error, "Không thể cập nhật thông tin."));
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = formText(form, "currentPassword");
    const newPassword = formText(form, "newPassword");
    if (newPassword !== formText(form, "confirmPassword")) {
      setMessage("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await mutateStaffAccount("password", {
        ...version,
        currentPassword,
        newPassword,
      });
      formElement.reset();
      // Every session is revoked after a password change.
      window.location.assign("/dang-nhap");
    } catch (error) {
      setMessage(describeApiError(error, "Không thể đổi mật khẩu."));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="Thông tin cá nhân"
        description={
          isAdmin
            ? "Cập nhật thông tin liên hệ và tên đăng nhập của bạn."
            : "Cập nhật thông tin liên hệ. Chỉ ADMIN được thay đổi tên đăng nhập."
        }
      >
        <form className="flex flex-col gap-4" onSubmit={saveProfile}>
          <FieldGroup className="grid md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="account-fullName">Họ và tên</FieldLabel>
              <Input
                id="account-fullName"
                name="fullName"
                defaultValue={user.fullName}
                maxLength={150}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-username">Tên đăng nhập</FieldLabel>
              <Input
                id="account-username"
                name="username"
                defaultValue={user.username}
                maxLength={100}
                autoComplete="username"
                disabled={!isAdmin}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-email">Email</FieldLabel>
              <Input
                id="account-email"
                name="email"
                type="email"
                defaultValue={user.email ?? ""}
                maxLength={255}
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-phone">Điện thoại</FieldLabel>
              <Input
                id="account-phone"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                minLength={10}
                maxLength={15}
                autoComplete="tel"
              />
            </Field>
          </FieldGroup>
          <Button className="w-full sm:w-fit" disabled={busy} type="submit">
            Lưu thông tin
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        title="Đổi mật khẩu"
        description="Sau khi đổi mật khẩu, mọi phiên đăng nhập sẽ bị thu hồi và bạn cần đăng nhập lại."
      >
        <form className="flex flex-col gap-4" onSubmit={changePassword}>
          <Field>
            <FieldLabel htmlFor="currentPassword">Mật khẩu hiện tại</FieldLabel>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              maxLength={128}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="newPassword">Mật khẩu mới</FieldLabel>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">
              Xác nhận mật khẩu mới
            </FieldLabel>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Button className="w-full sm:w-fit" disabled={busy} type="submit">
            Đổi mật khẩu
          </Button>
        </form>
      </SectionCard>

      <OperationResultAlert message={message} />
    </div>
  );
}
