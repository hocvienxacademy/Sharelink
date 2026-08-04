import { listSystemSettings } from "@/composition/system-settings";
import { createSystemSettingListHandler } from "@/modules/system-settings/presentation/http/admin-system-setting-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createSystemSettingListHandler(listSystemSettings.execute.bind(listSystemSettings));
