"use client";

import { PencilIcon, PowerIcon, PowerOffIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ActiveStatusBadge({
  isActive,
}: {
  readonly isActive: boolean;
}) {
  return (
    <Badge variant="secondary">{isActive ? "Hoạt động" : "Tạm dừng"}</Badge>
  );
}

export function EditButton({
  onClick,
  disabled = false,
}: {
  readonly onClick: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <Button
      className="w-full sm:w-auto"
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
    >
      <PencilIcon data-icon="inline-start" />
      Sửa
    </Button>
  );
}

export function ActivationButton({
  isActive,
  onClick,
  disabled,
}: {
  readonly isActive: boolean;
  readonly onClick: () => void;
  readonly disabled: boolean;
}) {
  return (
    <Button
      className="w-full sm:w-auto"
      type="button"
      variant={isActive ? "outline" : "default"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
    >
      {isActive ? (
        <PowerOffIcon data-icon="inline-start" />
      ) : (
        <PowerIcon data-icon="inline-start" />
      )}
      {isActive ? "Tạm dừng" : "Kích hoạt"}
    </Button>
  );
}

export const activationAction = (isActive: boolean) =>
  isActive ? "deactivate" : "activate";

export const activationResult = (isActive: boolean) =>
  isActive ? "kích hoạt" : "tạm dừng";
