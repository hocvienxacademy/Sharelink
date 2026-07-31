import type { z } from "zod";
import { ValidationError } from "../errors/index";

export function parseWithSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.map((segment) =>
          typeof segment === "symbol" ? segment.description ?? "symbol" : segment,
        ),
        code: issue.code,
        message: issue.message,
      })),
    );
  }

  return result.data;
}
