"use client";

import { useState, type FormEvent } from "react";
import { HistoryIcon, PencilIcon, PlusIcon, PowerIcon, PowerOffIcon, StarIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { requestCatalog } from "./catalog-api-client";

export interface BankAccountView {
  readonly id: string;
  readonly bankCode: string;
  readonly bankName: string;
  readonly branchName: string | null;
  readonly accountNumber: string | null;
  readonly maskedAccountNumber: string;
  readonly accountName: string;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly updatedAt: string;
}

interface HistoryItem { readonly id: string; readonly action: string; readonly actorName: string | null; readonly occurredAt: string }

const sortAccounts = (items: readonly BankAccountView[]) => [...items].sort((a, b) =>
  Number(b.isDefault) - Number(a.isDefault)
  || a.bankCode.localeCompare(b.bankCode)
  || a.bankName.localeCompare(b.bankName)
  || a.id.localeCompare(b.id));

function AccountFields({ value, prefix }: { readonly value?: BankAccountView; readonly prefix: string }) {
  return (
    <FieldGroup className="grid md:grid-cols-2 xl:grid-cols-3">
      <Field><FieldLabel htmlFor={`${prefix}-bank-code`}>Mã ngân hàng</FieldLabel><Input id={`${prefix}-bank-code`} name="bankCode" defaultValue={value?.bankCode} maxLength={30} required /></Field>
      <Field><FieldLabel htmlFor={`${prefix}-bank-name`}>Tên ngân hàng</FieldLabel><Input id={`${prefix}-bank-name`} name="bankName" defaultValue={value?.bankName} maxLength={150} required /></Field>
      <Field><FieldLabel htmlFor={`${prefix}-branch-name`}>Chi nhánh</FieldLabel><Input id={`${prefix}-branch-name`} name="branchName" defaultValue={value?.branchName ?? ""} maxLength={255} /></Field>
      <Field><FieldLabel htmlFor={`${prefix}-account-number`}>Số tài khoản</FieldLabel><Input id={`${prefix}-account-number`} name="accountNumber" defaultValue={value?.accountNumber ?? ""} inputMode="numeric" pattern="[0-9]+" maxLength={50} required /></Field>
      <Field><FieldLabel htmlFor={`${prefix}-account-name`}>Tên chủ tài khoản</FieldLabel><Input id={`${prefix}-account-name`} name="accountName" defaultValue={value?.accountName} maxLength={255} required /></Field>
    </FieldGroup>
  );
}

export function BankAccountManagementPanel({
  canManage,
  initialItems,
}: {
  readonly canManage: boolean;
  readonly initialItems: readonly BankAccountView[];
}) {
  const [items, setItems] = useState(sortAccounts(initialItems));
  const [editing, setEditing] = useState<BankAccountView | null>(null);
  const [history, setHistory] = useState<{ readonly id: string; readonly items: readonly HistoryItem[] } | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ readonly message: string; readonly error: boolean } | null>(null);

  const reload = async () => setItems(sortAccounts(await requestCatalog<readonly BankAccountView[]>("/api/admin/bank-accounts", "GET")));
  const run = async (operation: () => Promise<unknown>, success: string) => {
    setPending(true); setFeedback(null);
    try { await operation(); await reload(); setEditing(null); setFeedback({ message: success, error: false }); }
    catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Không thể thực hiện thao tác.", error: true }); }
    finally { setPending(false); }
  };

  const values = (form: FormData) => ({
    bankCode: form.get("bankCode"), bankName: form.get("bankName"), branchName: form.get("branchName"),
    accountNumber: form.get("accountNumber"), accountName: form.get("accountName"),
  });
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    await run(async () => { await requestCatalog("/api/admin/bank-accounts", "POST", values(new FormData(formElement))); formElement.reset(); }, "Đã tạo tài khoản ở trạng thái tạm dừng.");
  };
  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (editing === null) return;
    await run(() => requestCatalog(`/api/admin/bank-accounts/${editing.id}`, "PATCH", { expectedUpdatedAt: editing.updatedAt, ...values(new FormData(event.currentTarget)) }), "Đã cập nhật tài khoản ngân hàng.");
  };
  const transition = async (item: BankAccountView) => {
    if (item.isActive && !window.confirm("Tạm dừng tài khoản này? Tài khoản sẽ không còn xuất hiện trong phạm vi SALE.")) return;
    await run(() => requestCatalog(`/api/admin/bank-accounts/${item.id}/${item.isActive ? "deactivate" : "activate"}`, "POST", { expectedUpdatedAt: item.updatedAt }), `Đã ${item.isActive ? "tạm dừng" : "kích hoạt"} tài khoản.`);
  };
  const setDefault = async (item: BankAccountView) => {
    if (!window.confirm("Đặt tài khoản này làm mặc định cho public registration context?")) return;
    await run(() => requestCatalog(`/api/admin/bank-accounts/${item.id}/set-default`, "POST", {
      expectedUpdatedAt: item.updatedAt,
      expectedCurrentDefaultId: items.find((account) => account.isDefault)?.id ?? null,
    }), "Đã thay đổi tài khoản mặc định.");
  };
  const clearDefault = async (item: BankAccountView) => {
    if (!window.confirm("Bỏ tài khoản mặc định? Public registration context sẽ tạm thời không hiển thị tài khoản nhận tiền.")) return;
    await run(() => requestCatalog(`/api/admin/bank-accounts/${item.id}/clear-default`, "POST", { expectedUpdatedAt: item.updatedAt }), "Đã bỏ tài khoản mặc định.");
  };
  const loadHistory = async (id: string) => {
    setPending(true); setFeedback(null);
    try { setHistory({ id, items: await requestCatalog<readonly HistoryItem[]>(`/api/admin/bank-accounts/${id}/history`, "GET") }); }
    catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Không thể tải lịch sử.", error: true }); }
    finally { setPending(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      {feedback !== null && <Alert variant={feedback.error ? "destructive" : "default"}><AlertTitle>{feedback.error ? "Không thể thực hiện" : "Đã cập nhật"}</AlertTitle><AlertDescription>{feedback.message}</AlertDescription></Alert>}
      {canManage && <Card><CardHeader><CardTitle>Tạo tài khoản ngân hàng</CardTitle><CardDescription>Bản ghi mới luôn tạm dừng và không mặc định.</CardDescription></CardHeader><CardContent><form onSubmit={create} className="flex flex-col gap-4"><AccountFields prefix="create-bank" /><Button className="w-full sm:w-fit" type="submit" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}Tạo tài khoản</Button></form></CardContent></Card>}
      {editing !== null && canManage && <Card><CardHeader><CardTitle>Chỉnh sửa {editing.bankCode}</CardTitle><CardDescription>Mã ngân hàng và số tài khoản sẽ bị khóa sau khi được payment confirmation tham chiếu.</CardDescription></CardHeader><CardContent><form onSubmit={update} className="flex flex-col gap-4"><AccountFields value={editing} prefix="edit-bank" /><div className="grid grid-cols-1 gap-2 sm:flex"><Button className="w-full sm:w-auto" type="submit" disabled={pending}>Lưu</Button><Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button></div></form></CardContent></Card>}
      <AdminResourceTable
        columns={[{ key: "bank", label: "Ngân hàng" }, { key: "number", label: "Số tài khoản" }, { key: "owner", label: "Chủ tài khoản" }, { key: "branch", label: "Chi nhánh" }, { key: "status", label: "Trạng thái" }, { key: "action", label: "" }]}
        emptyDescription="Chưa có tài khoản ngân hàng."
        rows={items.map((item) => ({
          id: item.id,
          bank: <div className="flex flex-wrap items-center gap-2"><span>{item.bankCode} — {item.bankName}</span>{item.isDefault && <Badge>Mặc định</Badge>}</div>,
          number: <span className="font-mono">{item.accountNumber ?? item.maskedAccountNumber}</span>,
          owner: item.accountName,
          branch: item.branchName ?? "—",
          status: <Badge variant="secondary">{item.isActive ? "Hoạt động" : "Tạm dừng"}</Badge>,
          action: <div className="flex flex-col gap-2">
            {canManage && <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              <Button className="w-full sm:w-auto" type="button" variant="outline" size="sm" onClick={() => setEditing(item)} disabled={pending}><PencilIcon data-icon="inline-start" />Sửa</Button>
              <Button className="w-full sm:w-auto" type="button" variant={item.isActive ? "outline" : "default"} size="sm" onClick={() => transition(item)} disabled={pending || item.isDefault}>{item.isActive ? <PowerOffIcon data-icon="inline-start" /> : <PowerIcon data-icon="inline-start" />}{item.isActive ? "Tạm dừng" : "Kích hoạt"}</Button>
              {item.isDefault ? <Button className="w-full sm:w-auto" type="button" variant="outline" size="sm" onClick={() => clearDefault(item)} disabled={pending}><StarIcon data-icon="inline-start" />Bỏ mặc định</Button> : <Button className="w-full sm:w-auto" type="button" variant="outline" size="sm" onClick={() => setDefault(item)} disabled={pending || !item.isActive}><StarIcon data-icon="inline-start" />Đặt mặc định</Button>}
              <Button className="w-full sm:w-auto" type="button" variant="ghost" size="sm" onClick={() => loadHistory(item.id)} disabled={pending}><HistoryIcon data-icon="inline-start" />Lịch sử</Button>
            </div>}
            {history?.id === item.id && <div className="flex flex-col gap-1 text-xs text-muted-foreground">{history.items.length === 0 ? <span>Chưa có lịch sử.</span> : history.items.map((entry) => <span key={entry.id}>{entry.action} · {entry.actorName ?? "Hệ thống"} · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.occurredAt))}</span>)}</div>}
          </div>,
        }))}
      />
    </div>
  );
}
