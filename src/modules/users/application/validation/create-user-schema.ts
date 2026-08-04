import { z } from "zod";
import { parseWithSchema } from "@/shared/validation";
import { USER_ROLES } from "../../domain/user";

export const createUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập họ và tên.")
      .max(150, "Họ và tên không được vượt quá 150 ký tự."),
    username: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên đăng nhập.")
      .max(100, "Tên đăng nhập không được vượt quá 100 ký tự.")
      .transform((value) => value.toLowerCase()),
    email: z
      .string()
      .trim()
      .pipe(z.email("Email không đúng định dạng.").max(255, "Email không được vượt quá 255 ký tự."))
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .nullable()
      .transform((value) => value === "" ? null : value)
      .pipe(
        z.union([
          z.null(),
          z.string().regex(/^\d{10,15}$/, "Số điện thoại phải gồm từ 10 đến 15 chữ số."),
        ]),
      ),
    role: z.enum(USER_ROLES, "Vai trò không hợp lệ."),
    managerId: z.uuid("Quản lý không hợp lệ.").nullable().optional(),
    password: z
      .string()
      .min(8, "Mật khẩu ban đầu phải có ít nhất 8 ký tự.")
      .max(128, "Mật khẩu không được vượt quá 128 ký tự."),
  })
  .superRefine((values, context) => {
    if (values.role !== "SALE" && values.managerId != null) {
      context.addIssue({ code: "custom", path: ["managerId"], message: "Chỉ SALE mới có quản lý trực tiếp." });
    }
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;

export function parseCreateUserInput(input: unknown): CreateUserInput {
  return parseWithSchema(createUserSchema, input);
}
