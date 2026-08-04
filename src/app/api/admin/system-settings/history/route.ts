import { getSystemSettingHistory } from "@/composition/system-settings";
import { createSystemSettingHistoryHandler } from "@/modules/system-settings/presentation/http/admin-system-setting-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createSystemSettingHistoryHandler(getSystemSettingHistory.execute.bind(getSystemSettingHistory));
