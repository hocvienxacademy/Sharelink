import { Prisma } from "../../../../generated/prisma/client";
import {
  ApplicationError,
  ConflictError,
  DatabaseError,
  NotFoundError,
} from "../../../errors/index";

function postgresDriverCode(error: unknown): string | null {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : null;
}

function rawConstraintViolation(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2010" ||
    typeof error.meta !== "object" ||
    error.meta === null ||
    !("driverAdapterError" in error.meta)
  ) {
    return false;
  }

  const driverError = error.meta.driverAdapterError;
  if (
    typeof driverError !== "object" ||
    driverError === null ||
    !("cause" in driverError)
  ) {
    return false;
  }

  const cause = driverError.cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (("kind" in cause &&
      ["ForeignKeyConstraintViolation", "UniqueConstraintViolation"].includes(
        typeof cause.kind === "string" ? cause.kind : "",
      )) ||
      ("originalCode" in cause &&
        ["23503", "23505"].includes(
          typeof cause.originalCode === "string" ? cause.originalCode : "",
        )))
  );
}

export function mapPrismaError(error: unknown): Error {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2003") {
      return new ConflictError(undefined, { cause: error });
    }

    if (error.code === "P2025") {
      return new NotFoundError(undefined, { cause: error });
    }

    if (rawConstraintViolation(error)) {
      return new ConflictError(undefined, { cause: error });
    }
  }

  if (["23503", "23505"].includes(postgresDriverCode(error) ?? "")) {
    return new ConflictError(undefined, { cause: error });
  }

  return new DatabaseError({ cause: error });
}

export async function executePrismaOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    throw mapPrismaError(error);
  }
}
