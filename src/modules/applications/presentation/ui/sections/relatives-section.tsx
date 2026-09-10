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
import { WORD_EXPORT_TEXT_LIMITS } from "../../../application/validation/application-schemas";
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
      `Người thân ${index + 1} sẽ bị xóa khỏi hồ sơ khi bạn chuyển sang trang sau.`,
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
                className="min-h-11"
                aria-label={`Xóa người thân ${index + 1}`}
                onClick={() => removeRelative(index)}
              >
                <Trash2Icon data-icon="inline-start" />
                Xóa
              </Button>
            </div>
            <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12">
              <ApplicationTextField
                className="sm:col-span-2 lg:col-span-6"
                name={`relatives.${index}.fullName`}
                label="Họ và tên"
                autoCapitalize="words"
                autoComplete={`section-relative-${index + 1} name`}
                maxLength={WORD_EXPORT_TEXT_LIMITS.relativeFullName}
                placeholder="Ví dụ: Nguyễn Thị Mai"
                spellCheck={false}
                required
              />
              <ApplicationTextField
                className="lg:col-span-3"
                name={`relatives.${index}.relationship`}
                label="Quan hệ"
                maxLength={WORD_EXPORT_TEXT_LIMITS.relativeRelationship}
                placeholder="Ví dụ: Mẹ"
                required
              />
              <ApplicationTextField
                className="lg:col-span-3"
                name={`relatives.${index}.occupation`}
                label="Nghề nghiệp"
                maxLength={WORD_EXPORT_TEXT_LIMITS.relativeOccupation}
                placeholder="Ví dụ: Giáo viên"
                required
              />
              <ApplicationTextField
                className="lg:col-span-4"
                name={`relatives.${index}.phone`}
                label="Điện thoại"
                autoComplete={`section-relative-${index + 1} tel`}
                description="Số điện thoại người thân phải gồm từ 10 đến 15 chữ số."
                inputMode="numeric"
                maxLength={15}
                placeholder="Ví dụ: 0912345678"
                spellCheck={false}
                type="tel"
                required
              />
              <div className="sm:col-span-2 lg:col-span-12">
                <ApplicationTextField
                  name={`relatives.${index}.address`}
                  label="Địa chỉ"
                  autoComplete={`section-relative-${index + 1} street-address`}
                  maxLength={WORD_EXPORT_TEXT_LIMITS.relativeAddress}
                  placeholder="Nhập địa chỉ hiện tại"
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
            className="min-h-11 w-full min-[480px]:w-auto min-[480px]:self-start"
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
