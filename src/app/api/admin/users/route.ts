import { createUser } from "@/composition/users";
import { createCreateAdminUserHandler } from "@/modules/users/presentation/http/admin-user-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createCreateAdminUserHandler(createUser);
