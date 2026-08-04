import { z } from "zod";
import { parseWithSchema } from "@/shared/validation";
import { USER_ACCOUNT_STATUSES, USER_ROLES } from "../../domain/user";

const expected = {
  expectedRole: z.enum(USER_ROLES),
  expectedStatus: z.enum(USER_ACCOUNT_STATUSES),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
};

export const profileUpdateSchema = z.object({
  ...expected,
  fullName: z.string().trim().min(1).max(150).optional(),
  username: z.string().trim().min(1).max(100).transform((value) => value.toLowerCase()).optional(),
  email: z.string().trim().pipe(z.email().max(255)).transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().nullable().transform((value) => value === "" ? null : value)
    .pipe(z.union([z.null(), z.string().regex(/^\d{10,15}$/)])).optional(),
}).strict().superRefine((values, context) => {
  if (values.fullName === undefined && values.username === undefined && values.email === undefined && values.phone === undefined) {
    context.addIssue({ code: "custom", message: "Cần cung cấp ít nhất một trường hồ sơ." });
  }
});

export const roleChangeSchema = z.object({ ...expected, role: z.enum(USER_ROLES) }).strict();
export const managerAssignmentSchema = z.object({ ...expected, managerId: z.uuid().nullable() }).strict();
export const accountTransitionSchema = z.object(expected).strict();
export const resetPasswordSchema = z.object({ ...expected, password: z.string().min(8).max(128) }).strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type RoleChangeInput = z.infer<typeof roleChangeSchema>;
export type ManagerAssignmentInput = z.infer<typeof managerAssignmentSchema>;
export type AccountTransitionInput = z.infer<typeof accountTransitionSchema>;

export const parseProfileUpdate = (input: unknown) => parseWithSchema(profileUpdateSchema, input);
export const parseRoleChange = (input: unknown) => parseWithSchema(roleChangeSchema, input);
export const parseManagerAssignment = (input: unknown) => parseWithSchema(managerAssignmentSchema, input);
export const parseAccountTransition = (input: unknown) => parseWithSchema(accountTransitionSchema, input);
export const parseResetPassword = (input: unknown) => parseWithSchema(resetPasswordSchema, input);
