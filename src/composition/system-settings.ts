import {
  GetPublicSystemSettings,
  GetSystemSettingHistory,
  ListSystemSettings,
  PrismaSystemSettingRepository,
  UpdateSystemSetting,
} from "@/modules/system-settings";

export const systemSettingRepository = new PrismaSystemSettingRepository();
export const listSystemSettings = new ListSystemSettings(systemSettingRepository);
export const getPublicSystemSettings = new GetPublicSystemSettings(systemSettingRepository);
export const updateSystemSetting = new UpdateSystemSetting(systemSettingRepository);
export const getSystemSettingHistory = new GetSystemSettingHistory(systemSettingRepository);
