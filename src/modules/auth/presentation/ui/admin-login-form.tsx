"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon, LockKeyholeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function AdminLoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: formData.get("identifier"),
          password: formData.get("password"),
        }),
      });

      if (!response.ok) {
        setErrorMessage(
          response.status === 401
            ? "Tên đăng nhập hoặc mật khẩu không đúng."
            : "Không thể đăng nhập lúc này. Vui lòng thử lại.",
        );
        return;
      }

      router.replace("/quan-tri");
      router.refresh();
    } catch {
      setErrorMessage("Không thể kết nối đến hệ thống. Vui lòng thử lại.");
    } finally {
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
        <Field>
          <FieldLabel htmlFor="identifier">Tài khoản</FieldLabel>
          <Input
            id="identifier"
            name="identifier"
            autoComplete="username"
            placeholder="Nhập tài khoản quản trị"
            required
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            required
          />
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
