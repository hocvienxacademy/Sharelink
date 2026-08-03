import type { CreatedUser } from "../../domain/user";
import type { PasswordHasher, UserRepository } from "../ports/user-repository";
import { parseCreateUserInput } from "../validation/create-user-schema";

export class CreateUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(actorId: string, input: unknown): Promise<CreatedUser> {
    const values = parseCreateUserInput(input);
    const passwordHash = await this.passwordHasher.hash(values.password);

    return this.userRepository.create({
      actorId,
      email: values.email,
      fullName: values.fullName,
      passwordHash,
      phone: values.phone,
      role: values.role,
    });
  }
}
