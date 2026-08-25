"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ADMISSION_QUALIFICATION_OPTIONS } from "@/shared/presentation/student-option-labels";

interface Option { readonly id: string; readonly label: string }
export interface RegistrationLinkFormInitial {
  readonly entryQualification: string | null;
  readonly expiresAtIso: string | null;
  readonly internalNote: string | null;
  readonly majorId: string | null;
  readonly paymentRound: string | null;
  readonly saleId: string;
  readonly studentNameHint: string | null;
  readonly updatedAtIso: string;
}

export function RegistrationLinkForm({
  initial,
  linkId,
  majors,
  sales,
  lockSaleSelection = false,
}: {
  readonly initial?: RegistrationLinkFormInitial;
  readonly linkId?: string;
  readonly majors: readonly Option[];
  readonly sales: readonly Option[];
  readonly lockSaleSelection?: boolean;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const expiry = String(data.get("expiresAt") ?? "");
    const commonPayload = {
      majorId: String(data.get("majorId") ?? ""),
      studentNameHint: String(data.get("studentNameHint") ?? ""),
      entryQualification: String(data.get("entryQualification") ?? ""),
      paymentRound: String(data.get("paymentRound") ?? ""),
      internalNote: String(data.get("internalNote") ?? ""),
      expiresAt: expiry === "" ? null : new Date(expiry).toISOString(),
    };
    const selectedSaleId = String(data.get("saleId") ?? "");
    const payload = linkId === undefined
      ? { ...commonPayload, ...(selectedSaleId === "" ? {} : { saleId: selectedSaleId }) }
      : {
          ...commonPayload,
          expectedStatus: "DRAFT",
          expectedUpdatedAt: initial?.updatedAtIso,
        };
    try {
      const response = await fetch(linkId === undefined ? "/api/admin/registration-links" : `/api/admin/registration-links/${linkId}`, {
        method: linkId === undefined ? "POST" : "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as { data?: { id?: string }; error?: { message?: string } };
      if (!response.ok) {
        setError(response.status === 403 ? "Bạn không có quyền thực hiện thao tác này." : response.status === 409 ? "Dữ liệu đã thay đổi hoặc trạng thái không còn phù hợp." : body.error?.message ?? "Không thể lưu liên kết.");
        return;
      }
      const id = body.data?.id ?? linkId;
      if (id !== undefined) router.push(`/quan-tri/lien-ket/${id}`);
      router.refresh();
    } catch {
      setError("Không thể kết nối tới hệ thống.");
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }

  const localExpiry = initial?.expiresAtIso?.slice(0, 16) ?? "";
  return (
    <Card className="max-w-4xl rounded-2xl sm:rounded-[2rem]">
      <CardHeader><CardTitle>{linkId === undefined ? "Thông tin liên kết mới" : "Chỉnh sửa liên kết nháp"}</CardTitle></CardHeader>
      <form onSubmit={submit}>
        <CardContent>
          <FieldGroup className="grid md:grid-cols-2">
            <Field><FieldLabel htmlFor="saleId">SALE phụ trách *</FieldLabel><select id="saleId" name="saleId" required disabled={linkId !== undefined || lockSaleSelection} defaultValue={initial?.saleId ?? sales[0]?.id ?? ""} className="h-10 w-full rounded-md border bg-background px-3 disabled:opacity-60"><option value="">Chọn SALE</option>{sales.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
            <Field><FieldLabel htmlFor="majorId">Ngành học</FieldLabel><select id="majorId" name="majorId" defaultValue={initial?.majorId ?? ""} className="h-10 w-full rounded-md border bg-background px-3"><option value="">Chưa chọn</option>{majors.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
            <Field><FieldLabel htmlFor="studentNameHint">Gợi ý tên sinh viên</FieldLabel><Input id="studentNameHint" name="studentNameHint" maxLength={150} defaultValue={initial?.studentNameHint ?? ""} /></Field>
            <Field><FieldLabel htmlFor="entryQualification">Trình độ đầu vào</FieldLabel><select id="entryQualification" name="entryQualification" defaultValue={initial?.entryQualification ?? ""} className="h-10 w-full rounded-md border bg-background px-3"><option value="">Chưa chọn</option>{ADMISSION_QUALIFICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            <Field><FieldLabel htmlFor="paymentRound">Đợt thanh toán</FieldLabel><Input id="paymentRound" name="paymentRound" maxLength={50} defaultValue={initial?.paymentRound ?? "D1"} /></Field>
            <Field><FieldLabel htmlFor="expiresAt">Hết hạn</FieldLabel><Input id="expiresAt" name="expiresAt" type="datetime-local" defaultValue={localExpiry} /></Field>
            <Field className="md:col-span-2"><FieldLabel htmlFor="internalNote">Ghi chú nội bộ</FieldLabel><textarea id="internalNote" name="internalNote" maxLength={2000} defaultValue={initial?.internalNote ?? ""} className="min-h-24 w-full rounded-md border bg-background p-3" /></Field>
          </FieldGroup>
          {error === null ? null : <Alert variant="destructive" className="mt-5"><AlertTitle>Chưa thể lưu</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        </CardContent>
        <CardFooter className="justify-end">
          <Button className="w-full sm:w-auto" type="submit" disabled={submitting}>
            {submitting ? <Spinner data-icon="inline-start" /> : null}
            {linkId === undefined ? "Tạo liên kết" : "Lưu thay đổi"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
