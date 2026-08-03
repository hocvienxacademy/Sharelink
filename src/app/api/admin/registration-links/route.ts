import { adminRegistrationLinks, registrationLinkQueries } from "@/composition/registration-links";
import { createRegistrationLinkCreateHandler, createRegistrationLinkListHandler } from "@/modules/registration-links/presentation/http/admin-registration-link-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createRegistrationLinkCreateHandler(adminRegistrationLinks);
export const GET = createRegistrationLinkListHandler(registrationLinkQueries.list.bind(registrationLinkQueries));
