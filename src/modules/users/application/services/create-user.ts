import type { CreatedUser } from "../../domain/user";
import type { AuthenticatedActor } from "@/shared/authorization";
import { UserAuthorizationPolicy, assertUserAuthorized } from "../authorization/user-authorization";
import type { PasswordHasher, UserRepository } from "../ports/user-repository";
import { parseCreateUserInput } from "../validation/create-user-schema";

export class CreateUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly policy = new UserAuthorizationPolicy(),
  ) {}

  async execute(actor: AuthenticatedActor, input: unknown): Promise<CreatedUser> {
    assertUserAuthorized(this.policy, "user.create", actor);
    const values = parseCreateUserInput(input);
    const passwordHash = await this.passwordHasher.hash(values.password);

    return this.userRepository.create({
      actorId: actor.userId,
      email: values.email,
      fullName: values.fullName,
      passwordHash,
      phone: values.phone,
      role: values.role,
      username: values.username,
      managerId: values.managerId ?? null,
    });
  }
}
