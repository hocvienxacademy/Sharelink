import { adminRegistrationLinks, registrationLinkQueries } from "@/composition/registration-links";
import { createRegistrationLinkDetailHandler, createRegistrationLinkUpdateHandler } from "@/modules/registration-links/presentation/http/admin-registration-link-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PATCH = createRegistrationLinkUpdateHandler(adminRegistrationLinks);
export const GET = createRegistrationLinkDetailHandler(registrationLinkQueries.detail.bind(registrationLinkQueries));
