"use client";

import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { GENDER_OPTIONS } from "@/shared/presentation/student-option-labels";
import {
  ApplicationSelectField,
  ApplicationTextField,
} from "../components/application-field";

export function PersonalInformationSection() {
  return (
    <FieldSet>
      <FieldLegend>Thông tin cá nhân và liên hệ</FieldLegend>
      <FieldDescription>
        Các trường có dấu * cần đầy đủ trước khi nộp hồ sơ. Bạn vẫn có thể
        lưu bản nháp khi đang nhập dở.
      </FieldDescription>
      <FieldGroup className="grid gap-5 md:grid-cols-2">
        <ApplicationTextField name="fullName" label="Họ và tên" required />
        <ApplicationTextField
          name="dateOfBirth"
          label="Ngày sinh"
          type="date"
          required
        />
        <ApplicationSelectField
          name="gender"
          label="Giới tính"
          options={GENDER_OPTIONS}
          required
        />
        <ApplicationTextField name="nationality" label="Quốc tịch" required />
        <ApplicationTextField name="placeOfBirth" label="Nơi sinh" required />
        <ApplicationTextField name="ethnicity" label="Dân tộc" required />
        <ApplicationTextField name="religion" label="Tôn giáo" required />
        <ApplicationTextField
          name="phone"
          label="Số điện thoại"
          inputMode="numeric"
          required
        />
        <ApplicationTextField
          name="email"
          label="Email"
          type="email"
          required
        />
        <ApplicationTextField
          name="citizenId"
          label="CCCD hoặc giấy tờ định danh"
          inputMode="numeric"
          required
        />
        <ApplicationTextField
          name="citizenIdIssuedDate"
          label="Ngày cấp giấy tờ định danh"
          type="date"
          required
        />
        <ApplicationTextField
          name="citizenIdIssuedPlace"
          label="Nơi cấp giấy tờ định danh"
          required
        />
        <div className="md:col-span-2">
          <ApplicationTextField
            name="permanentAddress"
            label="Địa chỉ thường trú"
            multiline
            required
          />
        </div>
        <div className="md:col-span-2">
          <ApplicationTextField
            name="contactAddress"
            label="Địa chỉ liên hệ"
            multiline
            required
          />
        </div>
        <div className="md:col-span-2">
          <ApplicationTextField
            name="workplace"
            label="Công việc hoặc đơn vị công tác"
            optional
          />
        </div>
      </FieldGroup>
    </FieldSet>
  );
}
