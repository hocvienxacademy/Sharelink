"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  GraduationCapIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  WifiOffIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { registrationTokenSchema } from "../../../registration-links/application/validation/registration-token-schema";
import {
  ApiClientError,
  getEditableApplication,
  getRegistrationContext,
  type EditableApplication,
  type RegistrationContext,
} from "./application-api-client";
import { ApplicationForm } from "./application-form";

export interface RegistrationQueryClient {
  getContext(token: string): Promise<RegistrationContext>;
  getApplication(
    token: string,
    applicationId: string,
  ): Promise<EditableApplication>;
}

const defaultQueryClient: RegistrationQueryClient = {
  getContext: getRegistrationContext,
  getApplication: getEditableApplication,
};

type ShellState =
  | { readonly kind: "loading" }
  | { readonly kind: "redirecting" }
  | { readonly kind: "invalid-token" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "contract-error" }
  | { readonly kind: "network-error" }
  | { readonly kind: "system-error" }
  | {
      readonly kind: "submitted";
      readonly context: RegistrationContext;
    }
  | {
      readonly kind: "ready";
      readonly application?: EditableApplication;
      readonly context: RegistrationContext;
    };

function applicationRoute(token: string, applicationId: string): string {
  return `/dang-ky/${encodeURIComponent(token)}/ho-so/${encodeURIComponent(applicationId)}`;
}

function displayDate(value: string | null): string {
  if (value === null) {
    return "Không giới hạn";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function LoadingState() {
  return (
    <Card aria-busy="true" className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>Đang tải thông tin đăng ký</CardTitle>
        <CardDescription>
          Vui lòng chờ trong giây lát.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

function StateAlert({
  description,
  icon: Icon,
  title,
  action,
}: {
  readonly action?: React.ReactNode;
  readonly description: string;
  readonly icon: typeof AlertTriangleIcon;
  readonly title: string;
}) {
  return (
    <Alert>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {action === undefined ? null : <div className="mt-3">{action}</div>}
      </AlertDescription>
    </Alert>
  );
}

function RegistrationContextHeader({
  context,
}: {
  readonly context: RegistrationContext;
}) {
  return (
    <Card className="rounded-[2rem] bg-primary text-primary-foreground">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{context.admissionPeriod.code}</Badge>
          <Badge variant="secondary">Liên kết đang hoạt động</Badge>
        </div>
        <CardTitle className="text-xl">
          {context.admissionPeriod.name}
        </CardTitle>
        <CardDescription className="text-primary-foreground/65">
          Thời gian tiếp nhận: {displayDate(context.admissionPeriod.startDate)}
          {" – "}
          {displayDate(context.admissionPeriod.endDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-2xl bg-primary-foreground/10 p-4">
          <GraduationCapIcon aria-hidden="true" />
          <span>
            {context.majors.length === 0
              ? "Không có ngành đang mở trong context."
              : `${context.majors.length} ngành có thể lựa chọn.`}
          </span>
        </div>
        <div className="flex items-start gap-2 rounded-2xl bg-primary-foreground/10 p-4">
          <ShieldCheckIcon aria-hidden="true" />
          <span>Thông tin chỉ được gửi qua API bảo mật của hệ thống.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentAccountCard({ context }: { readonly context: RegistrationContext }) {
  const account = context.bankAccount;
  if (account === null) {
    return (
      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle>Chưa có tài khoản nhận thanh toán</CardTitle>
          <CardDescription>
          Nhà trường chưa cấu hình tài khoản nhận tiền mặc định. Vui lòng liên hệ đơn vị tuyển sinh trước khi chuyển khoản.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>Thông tin tài khoản nhận thanh toán</CardTitle>
        <CardDescription>Chỉ sử dụng thông tin hiển thị trực tiếp từ hệ thống tại thời điểm chuyển khoản.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
        <div><p className="text-muted-foreground">Ngân hàng</p><p className="font-medium">{account.bankCode} — {account.bankName}</p></div>
        <div><p className="text-muted-foreground">Số tài khoản</p><p className="font-mono text-base font-semibold">{account.accountNumber}</p></div>
        <div><p className="text-muted-foreground">Chủ tài khoản</p><p className="font-medium">{account.accountName}</p></div>
        <div><p className="text-muted-foreground">Chi nhánh</p><p className="font-medium">{account.branchName ?? "—"}</p></div>
      </CardContent>
    </Card>
  );
}

function PaymentInstructionsCard({ context }: { readonly context: RegistrationContext }) {
  if (context.paymentInstructions === null) return null;
  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>Hướng dẫn thanh toán</CardTitle>
        <CardDescription>Nội dung hướng dẫn chính thức từ đơn vị tuyển sinh.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm leading-6">{context.paymentInstructions}</p>
      </CardContent>
    </Card>
  );
}

export function RegistrationFormShellView({
  applicationId,
  queryClient = defaultQueryClient,
  replaceRoute,
  token,
}: {
  readonly applicationId?: string;
  readonly queryClient?: RegistrationQueryClient;
  readonly replaceRoute: (route: string) => void;
  readonly token: string;
}) {
  const tokenIsValid = registrationTokenSchema.safeParse(token).success;
  const [reloadCounter, setReloadCounter] = useState(0);
  const [state, setState] = useState<ShellState>(
    tokenIsValid ? { kind: "loading" } : { kind: "invalid-token" },
  );

  const load = useCallback(async () => {
    if (!tokenIsValid) {
      setState({ kind: "invalid-token" });
      return;
    }

    setState({ kind: "loading" });

    try {
      const context = await queryClient.getContext(token);
      const hasReference = context.application !== null;

      if (context.hasApplication !== hasReference) {
        setState({ kind: "contract-error" });
        return;
      }

      if (applicationId === undefined) {
        if (context.application !== null) {
          setState({ kind: "redirecting" });
          replaceRoute(applicationRoute(token, context.application.id));
          return;
        }

        setState({ kind: "ready", context });
        return;
      }

      if (
        context.application === null ||
        context.application.id !== applicationId
      ) {
        setState({ kind: "unavailable" });
        return;
      }

      if (!["DRAFT", "NEEDS_REVISION"].includes(context.application.status)) {
        setState({ kind: "submitted", context });
        return;
      }

      const application = await queryClient.getApplication(
        token,
        applicationId,
      );
      setState({ kind: "ready", context, application });
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        if (error.kind === "not-found") {
          setState({ kind: "unavailable" });
          return;
        }

        if (error.kind === "network") {
          setState({ kind: "network-error" });
          return;
        }
      }

      setState({ kind: "system-error" });
    }
  }, [
    applicationId,
    queryClient,
    reloadCounter,
    replaceRoute,
    token,
    tokenIsValid,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "loading" || state.kind === "redirecting") {
    return <LoadingState />;
  }

  if (state.kind === "invalid-token") {
    return (
      <StateAlert
        icon={AlertTriangleIcon}
        title="Liên kết không hợp lệ"
        description="Địa chỉ đăng ký không đúng định dạng. Vui lòng kiểm tra lại liên kết được cung cấp."
      />
    );
  }

  if (state.kind === "unavailable") {
    return (
      <StateAlert
        icon={AlertTriangleIcon}
        title="Liên kết không còn khả dụng"
        description="Liên kết có thể không tồn tại, đã hết hạn, không còn hoạt động hoặc hiện không có kỳ tuyển sinh đang mở. Hệ thống không cung cấp thêm chi tiết để bảo vệ hồ sơ."
      />
    );
  }

  if (state.kind === "contract-error") {
    return (
      <StateAlert
        icon={AlertTriangleIcon}
        title="Không thể mở lại hồ sơ hiện tại"
        description="Hệ thống xác nhận đã có hồ sơ nhưng không cung cấp đủ mã tham chiếu để mở lại. Vui lòng liên hệ đơn vị tuyển sinh."
      />
    );
  }

  if (state.kind === "network-error") {
    return (
      <StateAlert
        icon={WifiOffIcon}
        title="Không có kết nối mạng"
        description="Không thể kết nối đến hệ thống. Vui lòng kiểm tra mạng rồi thử lại."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => setReloadCounter((value) => value + 1)}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Thử lại
          </Button>
        }
      />
    );
  }

  if (state.kind === "system-error") {
    return (
      <StateAlert
        icon={AlertTriangleIcon}
        title="Hệ thống tạm thời gián đoạn"
        description="Không thể tải hồ sơ lúc này. Vui lòng thử lại sau ít phút."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => setReloadCounter((value) => value + 1)}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Thử lại
          </Button>
        }
      />
    );
  }

  if (state.kind === "submitted") {
    return (
      <div className="flex flex-col gap-5">
        <RegistrationContextHeader context={state.context} />
        <PaymentAccountCard context={state.context} />
        <PaymentInstructionsCard context={state.context} />
        <StateAlert
          icon={CheckCircle2Icon}
          title="Hồ sơ không còn ở trạng thái bản nháp"
          description="Hồ sơ đã được nộp hoặc đang được xử lý. Giao diện chỉnh sửa đã được khóa."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <RegistrationContextHeader context={state.context} />
      <PaymentAccountCard context={state.context} />
      <PaymentInstructionsCard context={state.context} />
      <ApplicationForm
        token={token}
        context={state.context}
        application={state.application}
        onApplicationCreated={(id) =>
          replaceRoute(applicationRoute(token, id))
        }
        onReload={() => setReloadCounter((value) => value + 1)}
      />
    </div>
  );
}

export function RegistrationFormShell({
  applicationId,
  token,
}: {
  readonly applicationId?: string;
  readonly token: string;
}) {
  const router = useRouter();

  return (
    <RegistrationFormShellView
      token={token}
      applicationId={applicationId}
      replaceRoute={(route) => router.replace(route)}
    />
  );
}
