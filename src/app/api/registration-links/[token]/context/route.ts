import { getRegistrationContext } from "@/composition/index";
import { createGetRegistrationContextHandler } from "@/modules/registration-links/presentation/http/registration-context-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createGetRegistrationContextHandler(
  getRegistrationContext,
);
