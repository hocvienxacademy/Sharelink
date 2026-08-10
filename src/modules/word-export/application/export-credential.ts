import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { parseWithSchema } from "@/shared/validation";

const exportCodeSchema = z
  .string()
  .trim()
  .min(20, "Mã tải hồ sơ không hợp lệ.")
  .max(128, "Mã tải hồ sơ không hợp lệ.")
  .regex(/^[A-Za-z0-9_-]+$/, "Mã tải hồ sơ không hợp lệ.");

export function digestExportCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function parseExportCode(input: unknown): string {
  return parseWithSchema(
    exportCodeSchema,
    input,
    "Mã tải hồ sơ không hợp lệ.",
  );
}

export class ExportCredentialFactory {
  constructor(
    private readonly random: (size: number) => Buffer = randomBytes,
  ) {}

  create(): { readonly code: string; readonly digest: string } {
    const code = this.random(16).toString("base64url");
    return { code, digest: digestExportCode(code) };
  }
}
