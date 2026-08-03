"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRightIcon, LockKeyholeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { z } from "zod";

const loginSuccessSchema = z.object({
  success: z.literal(true),
  data: z.object({ user: z.object({ role: z.enum(["SALE", "MANAGER", "ADMIN"]) }) }),
});

export function AdminLoginForm() {
  const router = useRouter();
  const requestLock = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    readonly password?: string;
    readonly username?: string;
  }>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestLock.current) return;

    const formData = new FormData(event.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");
    const nextFieldErrors = {
      ...(typeof username !== "string" || username.trim().length === 0
        ? { username: "Vui lòng nhập tên đăng nhập." }
        : {}),
      ...(typeof password !== "string" || password.length === 0
        ? { password: "Vui lòng nhập mật khẩu." }
        : {}),
    };

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setErrorMessage("Vui lòng kiểm tra các trường được đánh dấu.");
      return;
    }

    requestLock.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        setErrorMessage(
          response.status === 401
            ? "Tên đăng nhập hoặc mật khẩu không đúng."
            : response.status === 403
              ? "Tài khoản đang bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ quản trị viên."
              : response.status === 422
                ? "Vui lòng kiểm tra tên đăng nhập và mật khẩu."
                : "Không thể đăng nhập lúc này. Vui lòng thử lại.",
        );
        return;
      }

      const result = loginSuccessSchema.safeParse(await response.json());
      if (!result.success) {
        setErrorMessage("Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.");
        return;
      }
      router.replace(
        result.data.data.user.role === "ADMIN"
          ? "/quan-tri"
          : "/quan-tri/lien-ket",
      );
      router.refresh();
    } catch {
      setErrorMessage("Không thể kết nối đến hệ thống. Vui lòng thử lại.");
    } finally {
      requestLock.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {errorMessage === null ? null : (
        <Alert variant="destructive">
          <LockKeyholeIcon />
          <AlertTitle>Đăng nhập chưa thành công</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={fieldErrors.username === undefined ? undefined : ""}>
          <FieldLabel htmlFor="username">Tên đăng nhập</FieldLabel>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="Nhập tên đăng nhập"
            required
            autoFocus
            aria-invalid={fieldErrors.username === undefined ? undefined : true}
            aria-describedby={fieldErrors.username === undefined ? undefined : "username-error"}
          />
          {fieldErrors.username === undefined ? null : (
            <FieldError id="username-error">{fieldErrors.username}</FieldError>
          )}
        </Field>
        <Field data-invalid={fieldErrors.password === undefined ? undefined : ""}>
          <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            required
            aria-invalid={fieldErrors.password === undefined ? undefined : true}
            aria-describedby={fieldErrors.password === undefined ? undefined : "password-error"}
          />
          {fieldErrors.password === undefined ? null : (
            <FieldError id="password-error">{fieldErrors.password}</FieldError>
          )}
        </Field>
      </FieldGroup>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <ArrowRightIcon data-icon="inline-end" />
        )}
        Đăng nhập
      </Button>
    </form>
  );
}
