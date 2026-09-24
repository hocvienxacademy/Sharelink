import { CircleCheckIcon, ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ApplicationFeeTransferStatus } from "../../domain/application-fee";

export function ApplicationFeeStatusBadge({
  iconOnly = false,
  status,
}: {
  readonly iconOnly?: boolean;
  readonly status: ApplicationFeeTransferStatus;
}) {
  const transferred = status === "TRANSFERRED";
  const Icon = transferred ? CircleCheckIcon : ClockIcon;
  const label = transferred ? "Đã chuyển" : "Chưa chuyển";

  return (
    <Badge
      variant={transferred ? "default" : "warning"}
      className={iconOnly ? "size-6 p-0" : undefined}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      <Icon data-icon={iconOnly ? undefined : "inline-start"} aria-hidden="true" />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </Badge>
  );
}
