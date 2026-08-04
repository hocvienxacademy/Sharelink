import { staffApplicationQueries } from "@/composition/applications";
import { createStaffApplicationHistoryHandler } from "@/modules/applications/presentation/http/staff-application-query-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createStaffApplicationHistoryHandler(staffApplicationQueries.history.bind(staffApplicationQueries));
