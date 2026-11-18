"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  FileSpreadsheetIcon,
  MailCheckIcon,
  ReceiptTextIcon,
  RotateCwIcon,
  UploadIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import type { StudentRosterParseResult } from "../../application/parse-student-roster";
import {
  canSendInvoice,
  filterRecipients,
  recipientFieldLabels,
  sortRecipients,
  studentMailStageLabels,
  type FilterConjunction,
  type RecipientFilterRule,
  type RecipientSortRule,
  type StudentMailRecipient,
  type StudentMailStage,
} from "../../domain/student-mail-recipient";
import {
  isSupportedRosterExtension,
  readStudentRosterFile,
  rosterFileExtension,
} from "../../infrastructure/browser-student-roster-reader";
import { RecipientViewToolbar } from "./recipient-view-toolbar";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const stageBadgeClass: Readonly<Record<StudentMailStage, string>> = {
  NOT_SENT: "bg-muted text-muted-foreground",
  NOTICE_SENT:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  INVOICE_SENT:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
};

const noticeButtonClass =
  "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600/40";
const invoiceButtonClass =
  "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600/40";
const resendButtonClass =
  "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:ring-emerald-600/30 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20";

type MailKind = "notice" | "invoice";

const mailShortLabels: Readonly<Record<MailKind, string>> = {
  notice: "TBHTTTNH",
  invoice: "HĐHPĐ1",
};

function hasReceived(item: StudentMailRecipient, kind: MailKind): boolean {
  return kind === "notice"
    ? item.stage !== "NOT_SENT"
    : item.stage === "INVOICE_SENT";
}

function SendMailButton({
  kind,
  sent,
  disabled,
  onClick,
}: {
  readonly kind: MailKind;
  readonly sent: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
}) {
  const Icon = sent
    ? RotateCwIcon
    : kind === "notice"
      ? MailCheckIcon
      : ReceiptTextIcon;
  return (
    <Button
      type="button"
      size="sm"
      variant={sent ? "outline" : "default"}
      className={
        sent
          ? resendButtonClass
          : kind === "notice"
            ? noticeButtonClass
            : invoiceButtonClass
      }
      disabled={disabled}
      onClick={onClick}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      {sent ? "Gửi lại" : "Gửi"} {mailShortLabels[kind]}
    </Button>
  );
}

interface Feedback {
  readonly title: string;
  readonly message: string;
  readonly error: boolean;
}

function StatTile({
  label,
  value,
  className,
}: {
  readonly label: string;
  readonly value: number;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border bg-background px-4 py-3",
        className,
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function StudentMailPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<readonly StudentMailRecipient[]>(
    [],
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<readonly RecipientFilterRule[]>([]);
  const [conjunction, setConjunction] = useState<FilterConjunction>("and");
  const [sorts, setSorts] = useState<readonly RecipientSortRule[]>([]);

  const visible = useMemo(
    () =>
      sortRecipients(
        filterRecipients(recipients, filters, conjunction, search),
        sorts,
      ),
    [recipients, filters, conjunction, search, sorts],
  );
  const counts = useMemo(
    () => ({
      total: recipients.length,
      notSent: recipients.filter((item) => item.stage === "NOT_SENT").length,
      notice: recipients.filter((item) => item.stage === "NOTICE_SENT").length,
      invoice: recipients.filter((item) => item.stage === "INVOICE_SENT")
        .length,
    }),
    [recipients],
  );
  const pendingNotice = visible.filter(
    (item) => item.stage === "NOT_SENT" && item.email !== "",
  );
  const pendingInvoice = visible.filter(
    (item) => item.stage === "NOTICE_SENT" && item.email !== "",
  );

  const loadFile = async (file: File) => {
    setFeedback(null);
    const extension = rosterFileExtension(file.name);
    if (extension === ".xls") {
      setFeedback({
        title: "Định dạng Excel cũ (.xls)",
        message:
          "Vui lòng mở file trong Excel và lưu lại dưới dạng .xlsx hoặc .csv rồi tải lên.",
        error: true,
      });
      return;
    }
    if (!isSupportedRosterExtension(extension)) {
      setFeedback({
        title: "Định dạng không hỗ trợ",
        message: "Vui lòng chọn file .xlsx hoặc .csv.",
        error: true,
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFeedback({
        title: "File quá lớn",
        message: "Dung lượng tối đa là 5 MB.",
        error: true,
      });
      return;
    }
    setReading(true);
    let result: StudentRosterParseResult;
    try {
      result = await readStudentRosterFile(file, extension);
    } catch {
      setFeedback({
        title: "Không đọc được file",
        message:
          "File bị hỏng hoặc không đúng định dạng. Nếu là Excel, dữ liệu phải nằm ở sheet đầu tiên.",
        error: true,
      });
      return;
    } finally {
      setReading(false);
    }
    if (result.recipients.length === 0) {
      setFeedback({
        title: "Không tìm thấy sinh viên",
        message:
          "File không có dòng dữ liệu hợp lệ. Dòng đầu tiên phải là tiêu đề cột (Tên sinh viên, Mã lớp, Email, Số điện thoại).",
        error: true,
      });
      return;
    }
    setFileName(file.name);
    setRecipients(result.recipients);
    setSearch("");
    setFilters([]);
    setSorts([]);
    const notes = [
      result.skippedRowCount > 0
        ? `bỏ qua ${result.skippedRowCount} dòng thiếu tên và email`
        : null,
      result.missingColumns.length > 0
        ? `không tìm thấy cột: ${result.missingColumns.map((column) => recipientFieldLabels[column]).join(", ")}`
        : null,
    ].filter((note): note is string => note !== null);
    setFeedback({
      title: `Đã đọc ${result.recipients.length} sinh viên`,
      message:
        notes.length === 0
          ? `Dữ liệu lấy từ ${file.name}.`
          : `Dữ liệu lấy từ ${file.name}; ${notes.join("; ")}.`,
      error: false,
    });
  };

  const onInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file !== undefined) await loadFile(file);
  };
  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file !== undefined) await loadFile(file);
  };
  const clearRoster = () => {
    if (!window.confirm("Gỡ danh sách hiện tại khỏi màn hình?")) return;
    setRecipients([]);
    setFileName(null);
    setFeedback(null);
    setSearch("");
    setFilters([]);
    setSorts([]);
  };

  // TODO: thay bằng lời gọi API gửi mail; hiện chỉ cập nhật trạng thái trên màn hình.
  const send = (kind: MailKind, targets: readonly StudentMailRecipient[]) => {
    if (targets.length === 0) return;
    const mailLabel =
      kind === "notice"
        ? "Thông báo hoàn tất thủ tục nhập học"
        : "Hóa đơn thu tiền học phí đợt 1";
    const question =
      targets.length === 1
        ? `${hasReceived(targets[0], kind) ? "Gửi lại" : "Gửi"} “${mailLabel}” tới ${targets[0].fullName || targets[0].email}?`
        : `Gửi “${mailLabel}” tới ${targets.length} sinh viên?`;
    if (!window.confirm(question)) return;
    const ids = new Set(targets.map((item) => item.id));
    const nextStage: StudentMailStage =
      kind === "notice" ? "NOTICE_SENT" : "INVOICE_SENT";
    setRecipients((items) =>
      items.map((item) => {
        if (!ids.has(item.id)) return item;
        if (kind === "invoice" && !canSendInvoice(item)) return item;
        // Re-sending the notice must not roll back a student who already received the invoice.
        if (kind === "notice" && item.stage === "INVOICE_SENT") return item;
        return { ...item, stage: nextStage };
      }),
    );
    setFeedback({
      title: "Đã ghi nhận",
      message: `Đã đánh dấu gửi “${mailLabel}” cho ${targets.length} sinh viên (chưa gửi email thật).`,
      error: false,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sinh viên</CardTitle>
          <CardDescription>
            Tải lên file Excel (.xlsx) hoặc CSV có các cột: Tên sinh viên, Mã
            lớp, Email, Số điện thoại. Dòng đầu tiên là tiêu đề cột.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30",
            )}
          >
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileSpreadsheetIcon aria-hidden="true" className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                Kéo thả file vào đây hoặc chọn từ máy
              </p>
              <p className="text-xs text-muted-foreground">
                Hỗ trợ .xlsx (sheet đầu tiên), .csv · tối đa 5 MB
              </p>
            </div>
            <input
              ref={inputRef}
              id="student-roster-file"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="sr-only"
              onChange={onInputChange}
            />
            <Button
              type="button"
              variant="outline"
              disabled={reading}
              onClick={() => inputRef.current?.click()}
            >
              {reading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <UploadIcon data-icon="inline-start" aria-hidden="true" />
              )}
              {reading
                ? "Đang đọc file…"
                : fileName === null
                  ? "Chọn file"
                  : "Tải file khác"}
            </Button>
          </div>
          {fileName !== null && (
            <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileSpreadsheetIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate font-medium">{fileName}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearRoster}
              >
                <XIcon data-icon="inline-start" aria-hidden="true" />
                Gỡ danh sách
              </Button>
            </div>
          )}
          {feedback !== null && (
            <Alert variant={feedback.error ? "destructive" : "default"}>
              <AlertTitle>{feedback.title}</AlertTitle>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {recipients.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Chưa có danh sách</EmptyTitle>
                <EmptyDescription>
                  Bảng dữ liệu sẽ hiển thị sau khi bạn tải lên file danh sách
                  sinh viên.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Tổng sinh viên" value={counts.total} />
            <StatTile label="Chưa gửi" value={counts.notSent} />
            <StatTile
              label="Đã gửi TBHTTTNH"
              value={counts.notice}
              className="border-emerald-200 dark:border-emerald-500/30"
            />
            <StatTile
              label="Đã gửi HĐHPĐ1"
              value={counts.invoice}
              className="border-blue-200 dark:border-blue-500/30"
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <RecipientViewToolbar
              search={search}
              onSearchChange={setSearch}
              filters={filters}
              onFiltersChange={setFilters}
              conjunction={conjunction}
              onConjunctionChange={setConjunction}
              sorts={sorts}
              onSortsChange={setSorts}
            />
            <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
              <Button
                type="button"
                size="sm"
                className={noticeButtonClass}
                disabled={pendingNotice.length === 0}
                onClick={() => send("notice", pendingNotice)}
              >
                <MailCheckIcon data-icon="inline-start" aria-hidden="true" />
                Gửi TBHTTTNH ({pendingNotice.length})
              </Button>
              <Button
                type="button"
                size="sm"
                className={invoiceButtonClass}
                disabled={pendingInvoice.length === 0}
                onClick={() => send("invoice", pendingInvoice)}
              >
                <ReceiptTextIcon data-icon="inline-start" aria-hidden="true" />
                Gửi HĐHPĐ1 ({pendingInvoice.length})
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Hiển thị {visible.length}/{recipients.length} sinh viên. Nút gửi
            hàng loạt áp dụng cho các dòng đang hiển thị chưa nhận thư tương
            ứng.
          </p>

          <AdminResourceTable
            columns={[
              { key: "index", label: "STT" },
              { key: "fullName", label: "Tên sinh viên" },
              { key: "classCode", label: "Mã lớp" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Số điện thoại" },
              { key: "stage", label: "Trạng thái" },
              { key: "action", label: "Thao tác" },
            ]}
            emptyDescription="Không có sinh viên nào khớp với điều kiện lọc."
            rows={visible.map((item, index) => ({
              id: item.id,
              index: (
                <span className="tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
              ),
              fullName: (
                <span className="font-medium">{item.fullName || "—"}</span>
              ),
              classCode: item.classCode || "—",
              email: item.email || "—",
              phone: <span className="tabular-nums">{item.phone || "—"}</span>,
              stage: (
                <Badge className={stageBadgeClass[item.stage]}>
                  {studentMailStageLabels[item.stage]}
                </Badge>
              ),
              action: (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  <SendMailButton
                    kind="notice"
                    sent={hasReceived(item, "notice")}
                    disabled={item.email === ""}
                    onClick={() => send("notice", [item])}
                  />
                  {canSendInvoice(item) && (
                    <SendMailButton
                      kind="invoice"
                      sent={hasReceived(item, "invoice")}
                      disabled={item.email === ""}
                      onClick={() => send("invoice", [item])}
                    />
                  )}
                </div>
              ),
            }))}
          />
        </>
      )}
    </div>
  );
}
