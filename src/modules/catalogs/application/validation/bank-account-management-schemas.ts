import { z } from "zod";
import { parseWithSchema } from "@/shared/validation";

const bankCode = z.string().trim().min(1).max(30).transform((value) => value.toUpperCase());
const bankName = z.string().trim().min(1).max(150);
const accountNumber = z.string().trim().min(1).max(50).regex(/^\d+$/, "Số tài khoản chỉ được gồm chữ số.");
const accountName = z.string().trim().min(1).max(255);
const branchName = z.union([z.string().trim().max(255), z.null()]).transform((value) => value === "" ? null : value);
const expectedUpdatedAt = z.iso.datetime({ offset: true });

export const createBankAccountSchema = z.object({
  bankCode,
  bankName,
  branchName: branchName.optional(),
  accountNumber,
  accountName,
}).strict();

export const updateBankAccountSchema = z.object({
  expectedUpdatedAt,
  bankCode: bankCode.optional(),
  bankName: bankName.optional(),
  branchName: branchName.optional(),
  accountNumber: accountNumber.optional(),
  accountName: accountName.optional(),
}).strict().superRefine((value, context) => {
  if (value.bankCode === undefined && value.bankName === undefined && value.branchName === undefined
    && value.accountNumber === undefined && value.accountName === undefined) {
    context.addIssue({ code: "custom", message: "Cần cung cấp ít nhất một trường cần cập nhật." });
  }
});

export const bankAccountTransitionSchema = z.object({ expectedUpdatedAt }).strict();
export const setDefaultBankAccountSchema = z.object({
  expectedUpdatedAt,
  expectedCurrentDefaultId: z.uuid().nullable(),
}).strict();

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type BankAccountTransitionInput = z.infer<typeof bankAccountTransitionSchema>;
export type SetDefaultBankAccountInput = z.infer<typeof setDefaultBankAccountSchema>;

export const parseCreateBankAccount = (input: unknown) => parseWithSchema(createBankAccountSchema, input);
export const parseUpdateBankAccount = (input: unknown) => parseWithSchema(updateBankAccountSchema, input);
export const parseBankAccountTransition = (input: unknown) => parseWithSchema(bankAccountTransitionSchema, input);
export const parseSetDefaultBankAccount = (input: unknown) => parseWithSchema(setDefaultBankAccountSchema, input);
