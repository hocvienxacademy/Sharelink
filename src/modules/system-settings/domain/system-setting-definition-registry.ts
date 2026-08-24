export const SYSTEM_SETTING_DEFINITIONS = [
  {
    key: "payment.instructions",
    visibility: "PUBLIC",
    editable: true,
    editableFields: ["message"],
  },
  {
    key: "payment.application_fee",
    visibility: "PUBLIC",
    editable: true,
    editableFields: ["amount"],
  },
  {
    key: "payment.transfer_content",
    visibility: "INTERNAL",
    editable: false,
    editableFields: [],
  },
  {
    key: "registration.link_policy",
    visibility: "INTERNAL",
    editable: false,
    editableFields: [],
  },
] as const;

export type AllowedSystemSettingKey = (typeof SYSTEM_SETTING_DEFINITIONS)[number]["key"];
export type SystemSettingDefinition = (typeof SYSTEM_SETTING_DEFINITIONS)[number];

export function getSystemSettingDefinition(key: string): SystemSettingDefinition | null {
  return SYSTEM_SETTING_DEFINITIONS.find((definition) => definition.key === key) ?? null;
}
