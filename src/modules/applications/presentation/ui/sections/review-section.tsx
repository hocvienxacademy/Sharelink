import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  formatAdmissionQualification,
  formatGender,
} from "@/shared/presentation/student-option-labels";
import type { RegistrationContext } from "../application-api-client";
import type { ApplicationFormValues } from "../application-form.types";

interface ReviewItem {
  readonly label: string;
  readonly optional?: boolean;
  readonly value: string | number | boolean | null;
}

function displayValue(value: ReviewItem["value"]): string {
  if (value === null || value === "") {
    return "Chưa nhập";
  }

  if (typeof value === "boolean") {
    return value ? "Có" : "Không";
  }

  return String(value);
}

function ReviewGrid({ items }: { readonly items: readonly ReviewItem[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      {items.map((item) => {
        const missing = item.value === null || item.value === "";

        return (
          <div key={item.label} className="flex flex-col gap-1">
            <dt className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {item.label}
              <Badge variant={item.optional ? "secondary" : "outline"}>
                {item.optional ? "Không bắt buộc" : "Bắt buộc"}
              </Badge>
            </dt>
            <dd
              className={
                missing
                  ? "text-sm font-medium text-destructive"
                  : "text-sm font-medium"
              }
            >
              {displayValue(item.value)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function ReviewSection({
  context,
  values,
}: {
  readonly context: RegistrationContext;
  readonly values: ApplicationFormValues;
}) {
  const major =
    context.majors.find((item) => item.id === values.majorId) ?? null;

  const personalItems: readonly ReviewItem[] = [
    { label: "Họ và tên", value: values.fullName },
    { label: "Ngày sinh", value: values.dateOfBirth },
    {
      label: "Giới tính",
      value: formatGender(values.gender),
    },
    { label: "Nơi sinh", value: values.placeOfBirth },
    { label: "Dân tộc", value: values.ethnicity },
    { label: "Tôn giáo", value: values.religion },
    { label: "Quốc tịch", value: values.nationality },
    { label: "Số điện thoại", value: values.phone },
    { label: "Email", value: values.email },
    { label: "CCCD hoặc giấy tờ định danh", value: values.citizenId },
    { label: "Ngày cấp giấy tờ", value: values.citizenIdIssuedDate },
    { label: "Nơi cấp giấy tờ", value: values.citizenIdIssuedPlace },
    { label: "Địa chỉ thường trú", value: values.permanentAddress },
    { label: "Địa chỉ liên hệ", value: values.contactAddress },
    {
      label: "Công việc hoặc đơn vị công tác",
      value: values.workplace,
      optional: true,
    },
  ];

  const educationItems: readonly ReviewItem[] = [
    {
      label: "Ngành đăng ký",
      value: major === null ? null : `${major.code} — ${major.name}`,
    },
    {
      label: "Đối tượng đầu vào",
      value: formatAdmissionQualification(values.entryQualification),
    },
    {
      label: "Bằng dùng để đăng ký xét tuyển",
      value: formatAdmissionQualification(values.admissionDiploma),
    },
    { label: "Ngành tốt nghiệp", value: values.graduateMajor },
    { label: "Năm tốt nghiệp", value: values.graduationYear },
    { label: "Tên trường THPT", value: values.highSchoolName },
    { label: "Xã/phường của trường THPT", value: values.highSchoolWard },
    {
      label: "Tỉnh/thành phố của trường THPT",
      value: values.highSchoolProvince,
    },
    {
      label: "Nơi khai hồ sơ",
      value: values.declarationPlace,
      optional: true,
    },
    {
      label: "Ngày khai hồ sơ",
      value: values.declarationDate,
      optional: true,
    },
    {
      label: "Xác nhận lời khai",
      value: values.declarationConfirmed,
      optional: true,
    },
    {
      label: "Đồng ý xử lý dữ liệu",
      value: values.dataProcessingConsent,
      optional: true,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-medium">
            Xem lại thông tin cá nhân
          </h2>
          <p className="text-sm text-muted-foreground">
            Trường bắt buộc còn trống được đánh dấu rõ bên dưới.
          </p>
        </div>
        <ReviewGrid items={personalItems} />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-medium">
          Học vấn và xét tuyển
        </h2>
        <ReviewGrid items={educationItems} />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-medium">Người thân</h2>
          <p className="text-sm text-muted-foreground">
            Không bắt buộc. Nếu đã thêm, mọi trường của người thân phải đầy đủ.
          </p>
        </div>
        {values.relatives.length === 0 ? (
          <p className="text-sm font-medium">Không có người thân.</p>
        ) : (
          values.relatives.map((relative, index) => (
            <div
              key={relative.position}
              className="flex flex-col gap-4 rounded-xl border p-4"
            >
              <h3 className="font-heading text-base font-medium">
                Người thân {index + 1}
              </h3>
              <ReviewGrid
                items={[
                  { label: "Họ và tên", value: relative.fullName },
                  { label: "Quan hệ", value: relative.relationship },
                  { label: "Nghề nghiệp", value: relative.occupation },
                  { label: "Điện thoại", value: relative.phone },
                  { label: "Địa chỉ", value: relative.address },
                ]}
              />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
