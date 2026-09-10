"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  ADMISSION_QUALIFICATION_OPTIONS,
  VIETNAM_PROVINCE_OPTIONS,
} from "@/shared/presentation/student-option-labels";
import { findVietnameseProvinceByName } from "@/shared/administrative-divisions/vietnamese-provinces";
import { WORD_EXPORT_TEXT_LIMITS } from "../../../application/validation/application-schemas";
import {
  getVietnameseWards,
  type RegistrationContext,
  type VietnameseWard,
} from "../application-api-client";
import type { ApplicationFormValues } from "../application-form.types";
import {
  ApplicationComboboxField,
  ApplicationCheckboxField,
  ApplicationDatePickerField,
  ApplicationSelectField,
  ApplicationTextField,
} from "../components/application-field";

export function EducationSection({
  context,
  loadWards = getVietnameseWards,
}: {
  readonly context: RegistrationContext;
  readonly loadWards?: (
    provinceCode: number,
  ) => Promise<readonly VietnameseWard[]>;
}) {
  const { control, setValue } = useFormContext<ApplicationFormValues>();
  const selectedProvince = useWatch({ control, name: "highSchoolProvince" });
  const previousProvince = useRef(selectedProvince);
  const [wards, setWards] = useState<readonly VietnameseWard[]>([]);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [wardLoadFailed, setWardLoadFailed] = useState(false);

  useEffect(() => {
    const provinceChanged = previousProvince.current !== selectedProvince;
    previousProvince.current = selectedProvince;

    if (provinceChanged) {
      setValue("highSchoolWard", null, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    const province = findVietnameseProvinceByName(selectedProvince);
    if (province === undefined) {
      setWards([]);
      setIsLoadingWards(false);
      setWardLoadFailed(false);
      return;
    }

    let ignoreResult = false;
    setWards([]);
    setIsLoadingWards(true);
    setWardLoadFailed(false);

    void loadWards(province.code)
      .then((result) => {
        if (!ignoreResult) setWards(result);
      })
      .catch(() => {
        if (!ignoreResult) setWardLoadFailed(true);
      })
      .finally(() => {
        if (!ignoreResult) setIsLoadingWards(false);
      });

    return () => {
      ignoreResult = true;
    };
  }, [loadWards, selectedProvince, setValue]);

  const wardDescription =
    selectedProvince === null
      ? "Vui lòng chọn tỉnh/thành phố trước."
      : wardLoadFailed
        ? "Không tải được danh sách xã/phường. Bạn vẫn có thể nhập tay."
        : undefined;

  return (
    <div className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>Học vấn và đăng ký xét tuyển</FieldLegend>
        <FieldDescription>
          Ngành đăng ký và đối tượng đầu vào là thông tin bắt buộc khi nộp hồ
          sơ.
        </FieldDescription>
        <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12">
          <ApplicationSelectField
            className="sm:col-span-2 lg:col-span-6"
            name="majorId"
            label="Ngành đăng ký"
            disabled={context.majorId !== null}
            description={
              context.majorId === null
                ? undefined
                : "Ngành đăng ký đã được cố định theo liên kết."
            }
            required
            placeholder="Chọn ngành đăng ký"
            options={context.majors.map((major) => ({
              value: major.id,
              label: major.name,
            }))}
          />
          <ApplicationSelectField
            className="sm:col-span-2 lg:col-span-6"
            name="entryQualification"
            label="Đối tượng đầu vào"
            disabled={context.entryQualification !== null}
            description={
              context.entryQualification === null
                ? undefined
                : "Đối tượng đầu vào đã được cố định theo liên kết."
            }
            required
            placeholder="Chọn đối tượng đầu vào"
            options={ADMISSION_QUALIFICATION_OPTIONS}
          />
          <ApplicationSelectField
            className="sm:col-span-2 lg:col-span-6"
            name="admissionDiploma"
            label="Bằng dùng để đăng ký xét tuyển"
            options={ADMISSION_QUALIFICATION_OPTIONS}
            placeholder="Chọn loại bằng"
            required
          />
          <ApplicationTextField
            className="sm:col-span-2 lg:col-span-6"
            name="graduateMajor"
            label="Ngành tốt nghiệp"
            maxLength={WORD_EXPORT_TEXT_LIMITS.graduateMajor}
            placeholder="Ví dụ: Công nghệ thông tin"
            required
          />
          <ApplicationTextField
            className="lg:col-span-3"
            name="graduationYear"
            label="Năm tốt nghiệp"
            description="Năm tốt nghiệp phải từ 1950 đến 2100."
            type="number"
            inputMode="numeric"
            min={1950}
            max={2100}
            placeholder="Ví dụ: 2024"
            required
          />
          <ApplicationTextField
            className="sm:col-span-2 lg:col-span-9"
            name="highSchoolName"
            label="Tên trường THPT nơi học lớp 12"
            maxLength={WORD_EXPORT_TEXT_LIMITS.highSchoolName}
            placeholder="Nhập đầy đủ tên trường"
            required
          />
          <ApplicationComboboxField
            className="sm:col-span-2 lg:col-span-6"
            name="highSchoolProvince"
            label="Tỉnh/thành phố của trường THPT"
            allowCustomValue={false}
            maxLength={WORD_EXPORT_TEXT_LIMITS.highSchoolProvince}
            options={VIETNAM_PROVINCE_OPTIONS}
            placeholder="Chọn hoặc nhập tỉnh/thành phố"
            required
          />
          <ApplicationComboboxField
            className="sm:col-span-2 lg:col-span-6"
            name="highSchoolWard"
            label="Xã/phường của trường THPT"
            disabled={selectedProvince === null || isLoadingWards}
            description={wardDescription}
            maxLength={WORD_EXPORT_TEXT_LIMITS.highSchoolWard}
            emptyMessage={
              wardLoadFailed ? "Nhập tên xã/phường để tiếp tục." : undefined
            }
            options={wards.map((ward) => ({
              value: ward.name,
              label: ward.name,
            }))}
            placeholder={
              isLoadingWards
                ? "Đang tải xã/phường..."
                : "Chọn hoặc nhập xã/phường"
            }
            required
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Khai hồ sơ</FieldLegend>
        <FieldDescription>
          Các trường trong phần này chưa được chính sách hiện tại xác nhận là
          bắt buộc.
        </FieldDescription>
        <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12">
          <ApplicationTextField
            className="sm:col-span-2 lg:col-span-9"
            name="declarationPlace"
            label="Nơi khai hồ sơ"
            maxLength={WORD_EXPORT_TEXT_LIMITS.declarationPlace}
            placeholder="Ví dụ: Trà Vinh"
            optional
          />
          <ApplicationDatePickerField
            className="lg:col-span-3"
            name="declarationDate"
            label="Ngày khai hồ sơ"
            optional
          />
          <div className="sm:col-span-2 lg:col-span-12">
            <ApplicationCheckboxField
              name="declarationConfirmed"
              label="Tôi xác nhận thông tin khai trong hồ sơ là chính xác"
              description="Trường xác nhận này hiện không bắt buộc để nộp hồ sơ."
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-12">
            <ApplicationCheckboxField
              name="dataProcessingConsent"
              label="Tôi đồng ý để nhà trường xử lý dữ liệu trong hồ sơ"
              description="Trường đồng ý này hiện không bắt buộc theo chính sách nộp hồ sơ."
            />
          </div>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
