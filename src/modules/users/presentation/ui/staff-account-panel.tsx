"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { UserDetail } from "../../application/ports/user-repository";
import { mutateStaffAccount, StaffAccountApiError } from "./staff-account-api-client";

interface Version { readonly expectedRole: UserDetail["role"]; readonly expectedStatus: UserDetail["status"]; readonly expectedUpdatedAt: string }

export function StaffAccountPanel({ user }: { readonly user: UserDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState<Version>({ expectedRole: user.role, expectedStatus: user.status, expectedUpdatedAt: user.updatedAt.toISOString() });
  useEffect(() => setVersion({ expectedRole: user.role, expectedStatus: user.status, expectedUpdatedAt: user.updatedAt.toISOString() }), [user.role, user.status, user.updatedAt]);

  async function profile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage(null);
    try {
      const result = await mutateStaffAccount("profile", {
        ...version,
        fullName: form.get("fullName"),
        username: form.get("username"),
        email: form.get("email"),
        phone: form.get("phone"),
      });
      setVersion({ expectedRole: result.role, expectedStatus: result.status, expectedUpdatedAt: result.updatedAt });
      setMessage("Thông tin tài khoản đã được cập nhật.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof StaffAccountApiError ? error.issues[0]?.message ?? error.message : "Không thể cập nhật thông tin.");
    } finally { setBusy(false); }
  }

  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) { setMessage("Mật khẩu xác nhận không khớp."); return; }
    setBusy(true); setMessage(null);
    try {
      await mutateStaffAccount("password", { ...version, currentPassword, newPassword });
      formElement.reset();
      window.location.assign("/dang-nhap");
    } catch (error) {
      setMessage(error instanceof StaffAccountApiError ? error.issues[0]?.message ?? error.message : "Không thể đổi mật khẩu.");
      setBusy(false);
    }
  }

  return <div className="grid gap-6 xl:grid-cols-2">
    <Card><CardHeader><CardTitle>Thông tin cá nhân</CardTitle><CardDescription>Cập nhật thông tin liên hệ và tên đăng nhập của bạn.</CardDescription></CardHeader>
      <CardContent><form className="flex flex-col gap-4" onSubmit={profile}><FieldGroup className="grid md:grid-cols-2">
        <Field><FieldLabel htmlFor="account-fullName">Họ và tên</FieldLabel><Input id="account-fullName" name="fullName" defaultValue={user.fullName} maxLength={150} required /></Field>
        <Field><FieldLabel htmlFor="account-username">Tên đăng nhập</FieldLabel><Input id="account-username" name="username" defaultValue={user.username} maxLength={100} autoComplete="username" required /></Field>
        <Field><FieldLabel htmlFor="account-email">Email</FieldLabel><Input id="account-email" name="email" type="email" defaultValue={user.email ?? ""} maxLength={255} autoComplete="email" required /></Field>
        <Field><FieldLabel htmlFor="account-phone">Điện thoại</FieldLabel><Input id="account-phone" name="phone" type="tel" defaultValue={user.phone ?? ""} minLength={10} maxLength={15} autoComplete="tel" /></Field>
      </FieldGroup><Button className="w-full sm:w-fit" disabled={busy} type="submit">Lưu thông tin</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Đổi mật khẩu</CardTitle><CardDescription>Sau khi đổi mật khẩu, mọi phiên đăng nhập sẽ bị thu hồi và bạn cần đăng nhập lại.</CardDescription></CardHeader>
      <CardContent><form className="flex flex-col gap-4" onSubmit={password}>
        <Field><FieldLabel htmlFor="currentPassword">Mật khẩu hiện tại</FieldLabel><Input id="currentPassword" name="currentPassword" type="password" maxLength={128} autoComplete="current-password" required /></Field>
        <Field><FieldLabel htmlFor="newPassword">Mật khẩu mới</FieldLabel><Input id="newPassword" name="newPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></Field>
        <Field><FieldLabel htmlFor="confirmPassword">Xác nhận mật khẩu mới</FieldLabel><Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></Field>
        <Button className="w-full sm:w-fit" disabled={busy} type="submit">Đổi mật khẩu</Button>
      </form></CardContent></Card>
    {message ? <Alert className="xl:col-span-2"><AlertTitle>Kết quả thao tác</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
  </div>;
}
