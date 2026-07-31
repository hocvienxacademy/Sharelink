"use client";

import { useState } from "react";
import { Trash2Icon, UserRoundPlusIcon } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type { ApplicationFormValues } from "../application-form.types";
import { emptyRelative } from "../application-form.types";
import { ApplicationTextField } from "../components/application-field";

export function RelativesSection() {
  const { control, setValue } = useFormContext<ApplicationFormValues>();
  const { append, fields, remove } = useFieldArray({
    control,
    name: "relatives",
  });
  const [removalMessage, setRemovalMessage] = useState<string | null>(null);

  const removeRelative = (index: number) => {
    remove(index);
    const remainingCount = fields.length - 1;

    for (let nextIndex = 0; nextIndex < remainingCount; nextIndex += 1) {
      setValue(`relatives.${nextIndex}.position`, nextIndex + 1, {
        shouldDirty: true,
      });
    }

    setRemovalMessage(
      `Người thân ${index + 1} sẽ bị xóa khỏi hồ sơ khi bạn lưu bản nháp.`,
    );
  };

  return (
    <FieldSet>
      <FieldLegend>Người thân</FieldLegend>
      <FieldDescription>
        Phần này không bắt buộc. Nếu thêm người thân, vui lòng nhập đủ năm
        trường thông tin. Tối đa hai người.
      </FieldDescription>

      <div className="flex flex-col gap-5">
        {removalMessage === null ? null : (
          <Alert role="status">
            <AlertTitle>Đã đánh dấu xóa</AlertTitle>
            <AlertDescription>{removalMessage}</AlertDescription>
          </Alert>
        )}

        {fields.map((relative, index) => (
          <div
            key={relative.id}
            className="flex flex-col gap-5 rounded-xl border bg-muted/20 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-base font-medium">
                Người thân {index + 1}
              </h3>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                aria-label={`Xóa người thân ${index + 1}`}
                onClick={() => removeRelative(index)}
              >
                <Trash2Icon data-icon="inline-start" />
                Xóa
              </Button>
            </div>
            <FieldGroup className="grid gap-5 md:grid-cols-2">
              <ApplicationTextField
                name={`relatives.${index}.fullName`}
                label="Họ và tên"
                required
              />
              <ApplicationTextField
                name={`relatives.${index}.relationship`}
                label="Quan hệ"
                required
              />
              <ApplicationTextField
                name={`relatives.${index}.occupation`}
                label="Nghề nghiệp"
                required
              />
              <ApplicationTextField
                name={`relatives.${index}.phone`}
                label="Điện thoại"
                inputMode="numeric"
                required
              />
              <div className="md:col-span-2">
                <ApplicationTextField
                  name={`relatives.${index}.address`}
                  label="Địa chỉ"
                  multiline
                  required
                />
              </div>
            </FieldGroup>
          </div>
        ))}

        {fields.length >= 2 ? null : (
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => {
              append(emptyRelative(fields.length + 1));
              setRemovalMessage(null);
            }}
          >
            <UserRoundPlusIcon data-icon="inline-start" />
            Thêm người thân
          </Button>
        )}
      </div>
    </FieldSet>
  );
}
