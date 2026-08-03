import { createDeniedStaffApplicationUpdateHandler } from "@/modules/applications/presentation/http/staff-application-mutation-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PATCH = createDeniedStaffApplicationUpdateHandler();
