import { BadRequestError } from "../../errors/index";

export async function readJsonBody(request: Request): Promise<unknown> {
  const body = await request.text();

  if (body.trim().length === 0) {
    throw new BadRequestError("The request body must contain valid JSON.");
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new BadRequestError("The request body must contain valid JSON.");
  }
}
