"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  WifiOffIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  ApplicationForm,
  type ApplicationMutationClient,
} from "./application-form";
import { StudentPaymentInformationPanel } from "./components/student-payment-information";

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

function LoadingState() {
  return (
    <Card aria-busy="true" className="rounded-2xl sm:rounded-[2rem]">
      <CardHeader>
        <CardTitle>Đang tải thông tin đăng ký</CardTitle>
        <CardDescription>Vui lòng chờ trong giây lát.</CardDescription>
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
        {action === undefined ? null : (
          <div className="mt-3 [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
            {action}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function RegistrationFormShellView({
  applicationId,
  mutationClient,
  queryClient = defaultQueryClient,
  replaceRoute,
  token,
}: {
  readonly applicationId?: string;
  readonly mutationClient?: ApplicationMutationClient;
  readonly queryClient?: RegistrationQueryClient;
  readonly replaceRoute: (route: string) => void;
  readonly token: string;
}) {
  const tokenIsValid = registrationTokenSchema.safeParse(token).success;
  const initialState: ShellState = tokenIsValid
    ? { kind: "loading" }
    : { kind: "invalid-token" };
  const [state, setState] = useState<ShellState>(initialState);

  // Opening another link or application starts over from the loading state.
  const requestKey = `${token}|${applicationId ?? ""}`;
  const [loadedKey, setLoadedKey] = useState(requestKey);
  if (loadedKey !== requestKey) {
    setLoadedKey(requestKey);
    setState(initialState);
  }

  /** Loads the registration context and decides which screen to show. */
  const resolveShellState = useCallback(async (): Promise<ShellState> => {
    try {
      const context = await queryClient.getContext(token);
      const hasReference = context.application !== null;

      if (context.hasApplication !== hasReference) {
        return { kind: "contract-error" };
      }

      if (applicationId === undefined) {
        if (context.application === null) return { kind: "ready", context };
        replaceRoute(applicationRoute(token, context.application.id));
        return { kind: "redirecting" };
      }

      if (
        context.application === null ||
        context.application.id !== applicationId
      ) {
        return { kind: "unavailable" };
      }

      if (!["DRAFT", "NEEDS_REVISION"].includes(context.application.status)) {
        return { kind: "submitted", context };
      }

      const application = await queryClient.getApplication(
        token,
        applicationId,
      );
      return { kind: "ready", context, application };
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.kind === "not-found") {
        return { kind: "unavailable" };
      }
      if (error instanceof ApiClientError && error.kind === "network") {
        return { kind: "network-error" };
      }
      return { kind: "system-error" };
    }
  }, [applicationId, queryClient, replaceRoute, token]);

  // Each load owns its result: a slower, outdated response never wins.
  const latestLoad = useRef(0);
  const load = useCallback(() => {
    const loadId = ++latestLoad.current;
    void resolveShellState().then((next) => {
      if (loadId === latestLoad.current) setState(next);
    });
  }, [resolveShellState]);

  useEffect(() => {
    if (tokenIsValid) load();
  }, [load, tokenIsValid]);

  const reload = () => {
    setState({ kind: "loading" });
    load();
  };

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
      <div className="grid gap-5">
        <StateAlert
          icon={AlertTriangleIcon}
          title="Liên kết không còn khả dụng để chỉnh sửa"
          description="Liên kết có thể không tồn tại, đã hết hạn hoặc không còn hoạt động. Nếu đã nộp hồ sơ nhưng chưa nhận được phiếu qua email, vui lòng kiểm tra thư rác hoặc liên hệ đơn vị tuyển sinh."
        />
      </div>
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
          <Button type="button" variant="outline" onClick={reload}>
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
          <Button type="button" variant="outline" onClick={reload}>
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
        <StateAlert
          icon={CheckCircle2Icon}
          title="Hồ sơ không còn ở trạng thái bản nháp"
          description="Hồ sơ đã được nộp hoặc đang được xử lý nên giao diện chỉnh sửa đã được khóa. Nếu chưa nhận được phiếu qua email, vui lòng kiểm tra thư rác hoặc liên hệ đơn vị tuyển sinh."
        />
        <StudentPaymentInformationPanel payment={state.context.payment} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ApplicationForm
        token={token}
        context={state.context}
        application={state.application}
        mutationClient={mutationClient}
        onReload={reload}
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
