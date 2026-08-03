"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  createUserSchema,
  type CreateUserInput,
} from "../../application/validation/create-user-schema";
import { AdminUserApiError, createAdminUser } from "./admin-user-api-client";

const createUserFormSchema = createUserSchema
  .extend({ confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  });

type CreateUserFormValues = z.input<typeof createUserFormSchema>;

const roleOptions = [
  { value: "SALE", label: "SALE — phụ trách hồ sơ" },
  { value: "MANAGER", label: "MANAGER — quản lý vận hành" },
  { value: "ADMIN", label: "ADMIN — toàn quyền quản trị" },
] as const;

export function CreateUserForm() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm<CreateUserFormValues>({
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      phone: "",
      role: "SALE",
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(createUserFormSchema) as Resolver<CreateUserFormValues>,
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = form;

  const submit = handleSubmit(async (values) => {
    setGeneralError(null);
    const { confirmPassword: _confirmPassword, ...input } = createUserFormSchema.parse(values);
    try {
      const user = await createAdminUser(input as CreateUserInput);
      router.push(`/quan-tri/nhan-su/${user.id}`);
      router.refresh();
    } catch (error: unknown) {
      if (!(error instanceof AdminUserApiError)) {
        setGeneralError("Không thể tạo tài khoản lúc này. Vui lòng thử lại.");
        return;
      }
      if (error.kind === "validation") {
        for (const issue of error.issues) {
          const field = issue.path[0];
          if (typeof field === "string" && field in values) {
            setError(field as keyof CreateUserFormValues, { message: issue.message });
          }
        }
        setGeneralError("Vui lòng kiểm tra các trường được đánh dấu.");
        return;
      }
      setGeneralError(
        error.kind === "conflict"
          ? "Tên đăng nhập, email hoặc số điện thoại đã được sử dụng."
          : error.kind === "unauthorized"
            ? "Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại."
            : error.kind === "network"
              ? "Không thể kết nối tới hệ thống."
              : "Không thể tạo tài khoản lúc này. Vui lòng thử lại.",
      );
    }
  });

  return (
    <Card className="max-w-3xl rounded-[2rem]">
      <CardHeader>
        <CardTitle>Thông tin tài khoản</CardTitle>
        <CardDescription>
          Tài khoản được kích hoạt ngay sau khi tạo. Mật khẩu không được hiển thị lại.
        </CardDescription>
      </CardHeader>
      <form onSubmit={submit} noValidate>
        <CardContent>
          <FieldGroup className="grid md:grid-cols-2">
            <Field data-invalid={Boolean(errors.fullName)}>
              <FieldLabel htmlFor="fullName">Họ và tên *</FieldLabel>
              <Input id="fullName" autoComplete="name" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
              <FieldError>{errors.fullName?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email">Email liên hệ *</FieldLabel>
              <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.username)}>
              <FieldLabel htmlFor="username">Tên đăng nhập *</FieldLabel>
              <Input id="username" autoComplete="username" aria-invalid={Boolean(errors.username)} {...register("username")} />
              <FieldDescription>Không phân biệt chữ hoa và chữ thường.</FieldDescription>
              <FieldError>{errors.username?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.phone)}>
              <FieldLabel htmlFor="phone">Số điện thoại (không bắt buộc)</FieldLabel>
              <Input id="phone" type="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
              <FieldError>{errors.phone?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.role)}>
              <FieldLabel htmlFor="role">Vai trò *</FieldLabel>
              <select
                id="role"
                aria-invalid={Boolean(errors.role)}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                {...register("role")}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <FieldDescription>ADMIN có toàn quyền truy cập khu vực quản trị.</FieldDescription>
              <FieldError>{errors.role?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="password">Mật khẩu ban đầu *</FieldLabel>
              <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
              <FieldDescription>Từ 8 đến 128 ký tự.</FieldDescription>
              <FieldError>{errors.password?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.confirmPassword)}>
              <FieldLabel htmlFor="confirmPassword">Xác nhận mật khẩu *</FieldLabel>
              <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...register("confirmPassword")} />
              <FieldError>{errors.confirmPassword?.message}</FieldError>
            </Field>
          </FieldGroup>
          {generalError === null ? null : (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>Chưa thể tạo tài khoản</AlertTitle>
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
            Tạo tài khoản
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
