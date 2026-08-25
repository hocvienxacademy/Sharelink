"use client";

import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { ADMISSION_QUALIFICATION_OPTIONS } from "@/shared/presentation/student-option-labels";
import type { RegistrationContext } from "../application-api-client";
import {
  ApplicationCheckboxField,
  ApplicationSelectField,
  ApplicationTextField,
} from "../components/application-field";

export function EducationSection({
  context,
}: {
  readonly context: RegistrationContext;
}) {
  return (
    <div className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>Học vấn và đăng ký xét tuyển</FieldLegend>
        <FieldDescription>
          Ngành đăng ký và đối tượng đầu vào là thông tin bắt buộc khi nộp hồ
          sơ.
        </FieldDescription>
        <FieldGroup className="grid gap-5 md:grid-cols-2">
          <ApplicationSelectField
            name="majorId"
            label="Ngành đăng ký"
            disabled={context.majorId !== null}
            description={
              context.majorId === null
                ? undefined
                : "Ngành đăng ký đã được cố định theo liên kết."
            }
            required
            options={context.majors.map((major) => ({
              value: major.id,
              label: `${major.code} — ${major.name}`,
            }))}
          />
          <ApplicationSelectField
            name="entryQualification"
            label="Đối tượng đầu vào"
            disabled={context.entryQualification !== null}
            description={
              context.entryQualification === null
                ? undefined
                : "Đối tượng đầu vào đã được cố định theo liên kết."
            }
            required
            options={ADMISSION_QUALIFICATION_OPTIONS}
          />
          <ApplicationSelectField
            name="admissionDiploma"
            label="Bằng dùng để đăng ký xét tuyển"
            options={ADMISSION_QUALIFICATION_OPTIONS}
            required
          />
          <ApplicationTextField
            name="graduateMajor"
            label="Ngành tốt nghiệp"
            required
          />
          <ApplicationTextField
            name="graduationYear"
            label="Năm tốt nghiệp"
            type="number"
            inputMode="numeric"
            required
          />
          <ApplicationTextField
            name="highSchoolName"
            label="Tên trường THPT nơi học lớp 12"
            required
          />
          <ApplicationTextField
            name="highSchoolWard"
            label="Xã/phường của trường THPT"
            required
          />
          <ApplicationTextField
            name="highSchoolProvince"
            label="Tỉnh/thành phố của trường THPT"
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
        <FieldGroup className="grid gap-5 md:grid-cols-2">
          <ApplicationTextField
            name="declarationPlace"
            label="Nơi khai hồ sơ"
            optional
          />
          <ApplicationTextField
            name="declarationDate"
            label="Ngày khai hồ sơ"
            type="date"
            optional
          />
          <div className="md:col-span-2">
            <ApplicationCheckboxField
              name="declarationConfirmed"
              label="Tôi xác nhận thông tin khai trong hồ sơ là chính xác"
              description="Trường xác nhận này hiện không bắt buộc để nộp hồ sơ."
            />
          </div>
          <div className="md:col-span-2">
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
