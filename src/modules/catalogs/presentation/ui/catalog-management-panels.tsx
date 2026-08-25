"use client";

import { useState, type FormEvent } from "react";
import { HistoryIcon, PencilIcon, PlusIcon, PowerIcon, PowerOffIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requestCatalog } from "./catalog-api-client";

export interface AdmissionPeriodView {
  readonly id: string; readonly code: string; readonly name: string;
  readonly startDate: string | null; readonly endDate: string | null;
  readonly isActive: boolean; readonly updatedAt: string;
}
export interface MajorView {
  readonly id: string; readonly code: string; readonly name: string; readonly displayOrder: number;
  readonly isActive: boolean; readonly updatedAt: string;
}
interface HistoryItem { readonly id: string; readonly action: string; readonly actorName: string | null; readonly occurredAt: string }

const dateInput = (value: string | null) => value?.slice(0, 10) ?? "";
const dateLabel = (value: string | null) => value === null ? "—" : new Intl.DateTimeFormat("vi-VN").format(new Date(value));

function Feedback({ message, error }: { readonly message: string | null; readonly error: boolean }) {
  if (message === null) return null;
  return <Alert variant={error ? "destructive" : "default"}><AlertTitle>{error ? "Không thể thực hiện" : "Đã cập nhật"}</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>;
}

function HistoryPanel({ basePath, id }: { readonly basePath: string; readonly id: string }) {
  const [items, setItems] = useState<readonly HistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { setItems(await requestCatalog<readonly HistoryItem[]>(`${basePath}/${id}/history`, "GET")); }
    finally { setLoading(false); }
  };
  return <div className="flex flex-col gap-2">
    <Button type="button" variant="ghost" size="sm" onClick={load} disabled={loading}>
      {loading ? <Spinner data-icon="inline-start" /> : <HistoryIcon data-icon="inline-start" />}Lịch sử
    </Button>
    {items !== null && <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      {items.length === 0 ? <span>Chưa có lịch sử.</span> : items.map((item) => <span key={item.id}>{item.action} · {item.actorName ?? "Hệ thống"} · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.occurredAt))}</span>)}
    </div>}
  </div>;
}

export function AdmissionPeriodManagementPanel({ initialItems, canManage }: { readonly initialItems: readonly AdmissionPeriodView[]; readonly canManage: boolean }) {
  const [items, setItems] = useState([...initialItems]);
  const [editing, setEditing] = useState<AdmissionPeriodView | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);

  const apply = (item: AdmissionPeriodView) => setItems((current) => current.map((value) => value.id === item.id ? item : value));
  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true); setFeedback(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const item = await requestCatalog<AdmissionPeriodView>("/api/admin/admission-periods", "POST", { code: form.get("code"), name: form.get("name"), startDate: form.get("startDate"), endDate: form.get("endDate") });
      setItems((current) => [item, ...current]); formElement.reset(); setFeedback({ message: "Đã tạo kỳ tuyển sinh ở trạng thái tạm dừng.", error: false });
    } catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Không thể tạo kỳ tuyển sinh.", error: true }); }
    finally { setPending(false); }
  };
  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (editing === null) return; setPending(true); setFeedback(null);
    const form = new FormData(event.currentTarget);
    try {
      const item = await requestCatalog<AdmissionPeriodView>(`/api/admin/admission-periods/${editing.id}`, "PATCH", { expectedUpdatedAt: editing.updatedAt, code: form.get("code"), name: form.get("name"), startDate: form.get("startDate"), endDate: form.get("endDate") });
      apply(item); setEditing(null); setFeedback({ message: "Đã cập nhật kỳ tuyển sinh.", error: false });
    } catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Không thể cập nhật.", error: true }); }
    finally { setPending(false); }
  };
  const transition = async (item: AdmissionPeriodView) => {
    setPending(true); setFeedback(null);
    try {
      const updated = await requestCatalog<AdmissionPeriodView>(`/api/admin/admission-periods/${item.id}/${item.isActive ? "deactivate" : "activate"}`, "POST", { expectedUpdatedAt: item.updatedAt });
      apply(updated); setFeedback({ message: `Đã ${updated.isActive ? "kích hoạt" : "tạm dừng"} kỳ tuyển sinh.`, error: false });
    } catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Không thể đổi trạng thái.", error: true }); }
    finally { setPending(false); }
  };

  return <div className="flex flex-col gap-6">
    <Feedback message={feedback?.message ?? null} error={feedback?.error ?? false} />
    {canManage && <Card><CardHeader><CardTitle>Tạo kỳ tuyển sinh</CardTitle><CardDescription>Bản ghi mới luôn ở trạng thái tạm dừng.</CardDescription></CardHeader><CardContent>
      <form onSubmit={submitCreate}><FieldGroup className="grid md:grid-cols-2 xl:grid-cols-4">
        <Field><FieldLabel htmlFor="period-code">Mã kỳ</FieldLabel><Input id="period-code" name="code" required maxLength={50} /></Field>
        <Field><FieldLabel htmlFor="period-name">Tên kỳ</FieldLabel><Input id="period-name" name="name" required maxLength={255} /></Field>
        <Field><FieldLabel htmlFor="period-start">Ngày bắt đầu</FieldLabel><Input id="period-start" name="startDate" type="date" required /></Field>
        <Field><FieldLabel htmlFor="period-end">Ngày kết thúc</FieldLabel><Input id="period-end" name="endDate" type="date" required /></Field>
        <Button type="submit" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}Tạo kỳ</Button>
      </FieldGroup></form>
    </CardContent></Card>}
    {editing !== null && canManage && <Card><CardHeader><CardTitle>Chỉnh sửa {editing.code}</CardTitle><CardDescription>Kỳ đã được tham chiếu chỉ có thể đổi tên.</CardDescription></CardHeader><CardContent>
      <form onSubmit={submitEdit}><FieldGroup className="grid md:grid-cols-2 xl:grid-cols-4">
        <Field><FieldLabel htmlFor="edit-period-code">Mã kỳ</FieldLabel><Input id="edit-period-code" name="code" defaultValue={editing.code} required /></Field>
        <Field><FieldLabel htmlFor="edit-period-name">Tên kỳ</FieldLabel><Input id="edit-period-name" name="name" defaultValue={editing.name} required /></Field>
        <Field><FieldLabel htmlFor="edit-period-start">Ngày bắt đầu</FieldLabel><Input id="edit-period-start" name="startDate" type="date" defaultValue={dateInput(editing.startDate)} required /></Field>
        <Field><FieldLabel htmlFor="edit-period-end">Ngày kết thúc</FieldLabel><Input id="edit-period-end" name="endDate" type="date" defaultValue={dateInput(editing.endDate)} required /></Field>
        <div className="flex gap-2"><Button type="submit" disabled={pending}>Lưu</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button></div>
      </FieldGroup></form>
    </CardContent></Card>}
    <Card className="overflow-hidden"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Mã</TableHead><TableHead>Tên kỳ</TableHead><TableHead>Bắt đầu</TableHead><TableHead>Kết thúc</TableHead><TableHead>Trạng thái</TableHead><TableHead>Thao tác</TableHead></TableRow></TableHeader><TableBody>
      {items.map((item) => <TableRow key={item.id}><TableCell>{item.code}</TableCell><TableCell>{item.name}</TableCell><TableCell>{dateLabel(item.startDate)}</TableCell><TableCell>{dateLabel(item.endDate)}</TableCell><TableCell><Badge variant="secondary">{item.isActive ? "Hoạt động" : "Tạm dừng"}</Badge></TableCell><TableCell><div className="flex flex-col gap-1">
        {canManage && <div className="flex gap-1"><Button type="button" variant="outline" size="sm" onClick={() => setEditing(item)}><PencilIcon data-icon="inline-start" />Sửa</Button><Button type="button" variant={item.isActive ? "outline" : "default"} size="sm" onClick={() => transition(item)} disabled={pending}>{item.isActive ? <PowerOffIcon data-icon="inline-start" /> : <PowerIcon data-icon="inline-start" />}{item.isActive ? "Tạm dừng" : "Kích hoạt"}</Button></div>}
        <HistoryPanel basePath="/api/admin/admission-periods" id={item.id} />
      </div></TableCell></TableRow>)}
    </TableBody></Table></CardContent></Card>
  </div>;
}

export function MajorManagementPanel({ initialItems, canManage }: { readonly initialItems: readonly MajorView[]; readonly canManage: boolean }) {
  const [items, setItems] = useState([...initialItems]); const [editing, setEditing] = useState<MajorView | null>(null);
  const [pending, setPending] = useState(false); const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const sorted = (values: MajorView[]) => [...values].sort((a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code));
  const apply = (item: MajorView) => setItems((current) => sorted(current.map((value) => value.id === item.id ? item : value)));
  const submitCreate = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setPending(true); setFeedback(null); const formElement = event.currentTarget; const form = new FormData(formElement);
    try { const item = await requestCatalog<MajorView>("/api/admin/majors", "POST", { code: form.get("code"), name: form.get("name"), displayOrder: Number(form.get("displayOrder")) }); setItems((current) => sorted([...current, item])); formElement.reset(); setFeedback({ message: "Đã tạo ngành ở trạng thái tạm dừng.", error: false }); }
    catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Không thể tạo ngành.", error: true }); } finally { setPending(false); }
  };
  const submitEdit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (editing === null) return; setPending(true); setFeedback(null); const form = new FormData(event.currentTarget);
    try { const item = await requestCatalog<MajorView>(`/api/admin/majors/${editing.id}`, "PATCH", { expectedUpdatedAt: editing.updatedAt, code: form.get("code"), name: form.get("name"), displayOrder: Number(form.get("displayOrder")) }); apply(item); setEditing(null); setFeedback({ message: "Đã cập nhật ngành học.", error: false }); }
    catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Không thể cập nhật.", error: true }); } finally { setPending(false); }
  };
  const transition = async (item: MajorView) => { setPending(true); setFeedback(null); try { const updated = await requestCatalog<MajorView>(`/api/admin/majors/${item.id}/${item.isActive ? "deactivate" : "activate"}`, "POST", { expectedUpdatedAt: item.updatedAt }); apply(updated); setFeedback({ message: `Đã ${updated.isActive ? "kích hoạt" : "tạm dừng"} ngành học.`, error: false }); } catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Không thể đổi trạng thái.", error: true }); } finally { setPending(false); } };
  const form = (mode: "create" | "edit") => { const value = mode === "edit" ? editing : null; return <form onSubmit={mode === "create" ? submitCreate : submitEdit}><FieldGroup className="grid md:grid-cols-3 xl:grid-cols-4"><Field><FieldLabel htmlFor={`${mode}-major-code`}>Mã ngành</FieldLabel><Input id={`${mode}-major-code`} name="code" defaultValue={value?.code} required maxLength={50} /></Field><Field><FieldLabel htmlFor={`${mode}-major-name`}>Tên ngành</FieldLabel><Input id={`${mode}-major-name`} name="name" defaultValue={value?.name} required maxLength={80} /></Field><Field><FieldLabel htmlFor={`${mode}-major-order`}>Thứ tự</FieldLabel><Input id={`${mode}-major-order`} name="displayOrder" type="number" min={0} step={1} defaultValue={value?.displayOrder ?? 0} required /></Field><div className="flex items-end gap-2"><Button type="submit" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : mode === "create" ? <PlusIcon data-icon="inline-start" /> : null}{mode === "create" ? "Tạo ngành" : "Lưu"}</Button>{mode === "edit" && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button>}</div></FieldGroup></form>; };
  return <div className="flex flex-col gap-6"><Feedback message={feedback?.message ?? null} error={feedback?.error ?? false} />{canManage && <Card><CardHeader><CardTitle>Tạo ngành học</CardTitle><CardDescription>Mã được chuẩn hóa uppercase; bản ghi mới ở trạng thái tạm dừng.</CardDescription></CardHeader><CardContent>{form("create")}</CardContent></Card>}{editing !== null && canManage && <Card><CardHeader><CardTitle>Chỉnh sửa {editing.code}</CardTitle><CardDescription>Ngành đã được tham chiếu không thể đổi mã.</CardDescription></CardHeader><CardContent>{form("edit")}</CardContent></Card>}<Card className="overflow-hidden"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Thứ tự</TableHead><TableHead>Mã ngành</TableHead><TableHead>Tên ngành</TableHead><TableHead>Trạng thái</TableHead><TableHead>Thao tác</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.displayOrder}</TableCell><TableCell>{item.code}</TableCell><TableCell>{item.name}</TableCell><TableCell><Badge variant="secondary">{item.isActive ? "Hoạt động" : "Tạm dừng"}</Badge></TableCell><TableCell><div className="flex flex-col gap-1">{canManage && <div className="flex gap-1"><Button type="button" variant="outline" size="sm" onClick={() => setEditing(item)}><PencilIcon data-icon="inline-start" />Sửa</Button><Button type="button" variant={item.isActive ? "outline" : "default"} size="sm" onClick={() => transition(item)} disabled={pending}>{item.isActive ? <PowerOffIcon data-icon="inline-start" /> : <PowerIcon data-icon="inline-start" />}{item.isActive ? "Tạm dừng" : "Kích hoạt"}</Button></div>}<HistoryPanel basePath="/api/admin/majors" id={item.id} /></div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}
