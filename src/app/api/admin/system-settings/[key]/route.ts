import { updateSystemSetting } from "@/composition/system-settings";
import { createSystemSettingUpdateHandler } from "@/modules/system-settings/presentation/http/admin-system-setting-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const PATCH = createSystemSettingUpdateHandler(updateSystemSetting.execute.bind(updateSystemSetting));
