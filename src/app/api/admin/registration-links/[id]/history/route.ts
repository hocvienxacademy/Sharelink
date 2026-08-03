import { registrationLinkQueries } from "@/composition/registration-links";
import { createRegistrationLinkHistoryHandler } from "@/modules/registration-links/presentation/http/admin-registration-link-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createRegistrationLinkHistoryHandler(registrationLinkQueries.history.bind(registrationLinkQueries));
