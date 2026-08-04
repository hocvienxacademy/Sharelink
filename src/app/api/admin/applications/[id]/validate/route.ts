import { staffApplicationAdministration } from "@/composition/applications";
import { createStaffApplicationMutationHandler } from "@/modules/applications/presentation/http/staff-application-mutation-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createStaffApplicationMutationHandler(staffApplicationAdministration.validate.bind(staffApplicationAdministration), "staff-application-validate");
