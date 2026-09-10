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
import { WORD_EXPORT_TEXT_LIMITS } from "../../../application/validation/application-schemas";
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
      <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12">
        <ApplicationTextField
          className="sm:col-span-2 lg:col-span-6"
          name="fullName"
          label="Họ và tên"
          autoCapitalize="words"
          autoComplete="name"
          maxLength={WORD_EXPORT_TEXT_LIMITS.fullName}
          placeholder="Ví dụ: Nguyễn Văn An"
          spellCheck={false}
          required
        />
        <ApplicationDatePickerField
          className="lg:col-span-3"
          name="dateOfBirth"
          label="Ngày sinh"
          required
        />
        <ApplicationSelectField
          className="lg:col-span-3"
          name="gender"
          label="Giới tính"
          options={GENDER_OPTIONS}
          placeholder="Chọn giới tính"
          required
        />
        <ApplicationSelectField
          className="sm:col-span-2 lg:col-span-6"
          name="placeOfBirth"
          label="Nơi sinh"
          options={VIETNAM_PROVINCE_OPTIONS}
          placeholder="Chọn tỉnh/thành phố"
          required
        />
        <ApplicationTextField
          className="lg:col-span-3"
          name="ethnicity"
          label="Dân tộc"
          maxLength={WORD_EXPORT_TEXT_LIMITS.ethnicity}
          placeholder="Ví dụ: Kinh"
          required
        />
        <ApplicationTextField
          className="lg:col-span-3"
          name="religion"
          label="Tôn giáo"
          maxLength={WORD_EXPORT_TEXT_LIMITS.religion}
          placeholder="Ví dụ: Không"
          required
        />
        <ApplicationTextField
          className="sm:col-span-2 lg:col-span-4"
          name="nationality"
          label="Quốc tịch"
          autoComplete="country-name"
          maxLength={WORD_EXPORT_TEXT_LIMITS.nationality}
          placeholder="Ví dụ: Việt Nam"
          required
        />
        <ApplicationTextField
          className="lg:col-span-4 lg:col-start-1"
          name="phone"
          label="Số điện thoại"
          autoComplete="tel"
          description="Số điện thoại phải gồm đúng 10 chữ số."
          inputMode="numeric"
          maxLength={10}
          placeholder="Ví dụ: 0912345678"
          spellCheck={false}
          type="tel"
          required
        />
        <ApplicationTextField
          className="sm:col-span-2 lg:col-span-8"
          name="email"
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          maxLength={WORD_EXPORT_TEXT_LIMITS.email}
          placeholder="Ví dụ: nguyenvanan@example.com"
          spellCheck={false}
          type="email"
          required
        />
        <ApplicationTextField
          className="lg:col-span-4"
          name="citizenId"
          label="CCCD hoặc giấy tờ định danh"
          autoCapitalize="none"
          description="Số giấy tờ định danh phải gồm từ 9 đến 12 chữ số."
          inputMode="numeric"
          maxLength={12}
          placeholder="Nhập từ 9 đến 12 chữ số"
          spellCheck={false}
          required
        />
        <ApplicationDatePickerField
          className="lg:col-span-3"
          name="citizenIdIssuedDate"
          label="Ngày cấp giấy tờ định danh"
          required
        />
        <ApplicationTextField
          className="sm:col-span-2 lg:col-span-5"
          name="citizenIdIssuedPlace"
          label="Nơi cấp giấy tờ định danh"
          maxLength={WORD_EXPORT_TEXT_LIMITS.citizenIdIssuedPlace}
          placeholder="Nhập nơi cấp trên giấy tờ"
          required
        />
        <div className="sm:col-span-2 lg:col-span-12">
          <ApplicationAddressAutocompleteField
            autoComplete="section-permanent street-address"
            name="permanentAddress"
            label="Địa chỉ thường trú"
            token={token}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-12">
          <ApplicationAddressAutocompleteField
            autoComplete="section-contact street-address"
            name="contactAddress"
            label="Địa chỉ liên hệ"
            token={token}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-12">
          <ApplicationTextField
            name="workplace"
            label="Công việc hoặc đơn vị công tác"
            maxLength={WORD_EXPORT_TEXT_LIMITS.workplace}
            placeholder="Ví dụ: Giáo viên hoặc Công ty ABC"
            optional
          />
        </div>
      </FieldGroup>
    </FieldSet>
  );
}
