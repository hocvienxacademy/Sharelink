import { adminRegistrationLinks } from "@/composition/registration-links";
import { createRegistrationLinkTransitionHandler } from "@/modules/registration-links/presentation/http/admin-registration-link-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createRegistrationLinkTransitionHandler("unlock", adminRegistrationLinks);
