import { createUser, queryUsers } from "@/composition/users";
import { createCreateAdminUserHandler, createUserListHandler } from "@/modules/users/presentation/http/admin-user-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createCreateAdminUserHandler(createUser);
export const GET = createUserListHandler(queryUsers.list.bind(queryUsers));
