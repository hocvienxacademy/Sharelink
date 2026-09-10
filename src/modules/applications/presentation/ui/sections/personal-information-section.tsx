"use client";

import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  GENDER_OPTIONS,
  VIETNAM_PROVINCE_OPTIONS,
} from "@/shared/presentation/student-option-labels";
import {
  ApplicationAddressAutocompleteField,
} from "../components/application-address-autocomplete-field";
import {
  ApplicationDatePickerField,
  ApplicationSelectField,
  ApplicationTextField,
} from "../components/application-field";

export function PersonalInformationSection({
  token,
}: {
  readonly token: string;
}) {
  return (
    <FieldSet>
      <FieldLegend>Thông tin cá nhân và liên hệ</FieldLegend>
      <FieldDescription>
        Các trường có dấu * cần đầy đủ trước khi nộp hồ sơ. Thông tin được lưu
        khi bạn chuyển sang trang sau.
      </FieldDescription>
      <FieldGroup className="grid gap-5 md:grid-cols-2">
        <ApplicationTextField name="fullName" label="Họ và tên" required />
        <ApplicationDatePickerField
          name="dateOfBirth"
          label="Ngày sinh"
          required
        />
        <ApplicationSelectField
          name="gender"
          label="Giới tính"
          options={GENDER_OPTIONS}
          required
        />
        <ApplicationTextField name="nationality" label="Quốc tịch" required />
        <ApplicationSelectField
          name="placeOfBirth"
          label="Nơi sinh"
          options={VIETNAM_PROVINCE_OPTIONS}
          placeholder="Chọn tỉnh/thành phố"
          required
        />
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
        <ApplicationDatePickerField
          name="citizenIdIssuedDate"
          label="Ngày cấp giấy tờ định danh"
          required
        />
        <ApplicationTextField
          name="citizenIdIssuedPlace"
          label="Nơi cấp giấy tờ định danh"
          required
        />
        <div className="md:col-span-2">
          <ApplicationAddressAutocompleteField
            name="permanentAddress"
            label="Địa chỉ thường trú"
            token={token}
          />
        </div>
        <div className="md:col-span-2">
          <ApplicationAddressAutocompleteField
            name="contactAddress"
            label="Địa chỉ liên hệ"
            token={token}
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
