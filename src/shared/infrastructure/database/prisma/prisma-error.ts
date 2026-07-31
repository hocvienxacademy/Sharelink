import { Prisma } from "../../../../generated/prisma/client";
import {
  ApplicationError,
  ConflictError,
  DatabaseError,
  NotFoundError,
} from "../../../errors/index";

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
