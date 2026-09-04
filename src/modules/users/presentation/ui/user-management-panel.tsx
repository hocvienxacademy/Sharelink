"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { UserDetail, UserListItem } from "../../application/ports/user-repository";
import type { UserRole } from "../../domain/user";
import { AdminUserApiError, mutateAdminUser } from "./admin-user-api-client";

interface Props { readonly user: UserDetail; readonly managers: readonly Pick<UserListItem, "id" | "fullName">[] }
export function UserManagementPanel({ user, managers }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expected, setExpected] = useState({ expectedRole: user.role, expectedStatus: user.status, expectedUpdatedAt: user.updatedAt.toISOString() });
  const [role, setRole] = useState<UserRole>(user.role);
  const [managerId, setManagerId] = useState(user.managerId ?? "");
  const [assignedManagerId, setAssignedManagerId] = useState(user.managerId ?? "");
  useEffect(() => {
    setExpected({ expectedRole: user.role, expectedStatus: user.status, expectedUpdatedAt: user.updatedAt.toISOString() });
    setRole(user.role);
    setManagerId(user.managerId ?? "");
    setAssignedManagerId(user.managerId ?? "");
  }, [user.managerId, user.role, user.status, user.updatedAt]);
  async function run(operation: Parameters<typeof mutateAdminUser>[1], input: unknown) {
    setBusy(true); setMessage(null);
    try {
      const result = await mutateAdminUser(user.id, operation, input);
      setExpected({ expectedRole: result.role, expectedStatus: result.status, expectedUpdatedAt: result.updatedAt });
      if (operation === "manager") setAssignedManagerId(managerId);
      router.refresh();
      setMessage("Thao tác đã hoàn tất.");
    }
    catch (error) {
      setMessage(error instanceof AdminUserApiError
        ? error.issues[0]?.message ?? error.message
        : "Không thể hoàn tất thao tác.");
    }
    finally { setBusy(false); }
  }
  function profile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void run("profile", { ...expected, fullName: form.get("fullName"), username: form.get("username"), email: form.get("email"), phone: form.get("phone") });
  }
  function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void run("reset-password", { ...expected, password: form.get("password") });
  }
  return <div className="grid gap-6 xl:grid-cols-2">
    <Card><CardHeader><CardTitle>Cập nhật hồ sơ</CardTitle><CardDescription>Chỉ chỉnh sửa thông tin nhận diện; không thay đổi quyền hoặc trạng thái.</CardDescription></CardHeader>
      <CardContent><form className="flex flex-col gap-4" onSubmit={profile}><FieldGroup className="grid md:grid-cols-2">
        <Field><FieldLabel htmlFor="fullName">Họ và tên</FieldLabel><Input id="fullName" name="fullName" defaultValue={user.fullName} required /></Field>
        <Field><FieldLabel htmlFor="username">Tên đăng nhập</FieldLabel><Input id="username" name="username" defaultValue={user.username} required /></Field>
        <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" defaultValue={user.email ?? ""} required /></Field>
        <Field><FieldLabel htmlFor="phone">Điện thoại</FieldLabel><Input id="phone" name="phone" defaultValue={user.phone ?? ""} /></Field>
      </FieldGroup><Button className="w-full sm:w-fit" disabled={busy} type="submit">Lưu hồ sơ</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Vai trò và quản lý</CardTitle><CardDescription>Đổi vai trò sẽ thu hồi toàn bộ phiên đăng nhập của tài khoản.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5">
      <form className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); void run("role", { ...expected, role }); }}>
        <Field className="flex-1"><FieldLabel htmlFor="role">Vai trò</FieldLabel><select id="role" name="role" value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"><option>SALE</option><option>MANAGER</option><option>ADMIN</option></select></Field><Button className="w-full sm:w-auto" disabled={busy || role === expected.expectedRole}>Đổi vai trò</Button>
      </form>
      {expected.expectedRole === "SALE" ? <form className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); void run("manager", { ...expected, managerId: managerId === "" ? null : managerId }); }}>
        <Field className="flex-1"><FieldLabel htmlFor="managerId">Quản lý trực tiếp</FieldLabel><select id="managerId" name="managerId" value={managerId} onChange={(event) => setManagerId(event.target.value)} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"><option value="">Chưa phân công</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.fullName}</option>)}</select></Field><Button className="w-full sm:w-auto" disabled={busy || managerId === assignedManagerId}>Phân công</Button>
      </form> : null}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Vòng đời và bảo mật</CardTitle><CardDescription>Khóa bảo mật tạm thời độc lập với trạng thái ACTIVE/DISABLED.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
      <Button className="w-full sm:w-auto" disabled={busy} variant={user.status === "ACTIVE" ? "destructive" : "default"} onClick={() => void run(user.status === "ACTIVE" ? "disable" : "enable", expected)}>{user.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"}</Button>
      <Button className="w-full sm:w-auto" disabled={busy || (user.failedLoginAttempts === 0 && user.lockedUntil === null)} variant="outline" onClick={() => void run("unlock-security", expected)}>Mở khóa bảo mật</Button>
      <Button className="w-full sm:w-auto" disabled={busy} variant="outline" onClick={() => void run("revoke-sessions", expected)}>Thu hồi mọi phiên</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Đặt lại mật khẩu</CardTitle><CardDescription>Thao tác mở khóa bảo mật và thu hồi mọi phiên của người dùng.</CardDescription></CardHeader><CardContent><form className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end" onSubmit={resetPassword}><Field className="flex-1"><FieldLabel htmlFor="password">Mật khẩu mới</FieldLabel><Input id="password" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></Field><Button className="w-full sm:w-auto" disabled={busy}>Đặt lại</Button></form></CardContent></Card>
    {message ? <Alert className="xl:col-span-2"><AlertTitle>Kết quả thao tác</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
  </div>;
}
