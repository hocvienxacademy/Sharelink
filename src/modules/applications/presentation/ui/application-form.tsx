"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  SendIcon,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormProvider,
  type FieldPath,
  type Resolver,
  useForm,
} from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  createDraftApplicationSchema,
  updateDraftApplicationSchema,
  type CreateDraftApplicationInput,
  type UpdateDraftApplicationInput,
} from "../../application/validation/application-schemas";
import {
  ApiClientError,
  createDraftApplication,
  submitApplication,
  updateDraftApplication,
  type DraftApplication,
  type EditableApplication,
  type RegistrationContext,
  type SubmittedApplication,
} from "./application-api-client";
import {
  initialFormValues,
  type ApplicationFormValues,
} from "./application-form.types";
import { mapValidationIssues } from "./application-error-mapper";
import { EducationSection } from "./sections/education-section";
import { PersonalInformationSection } from "./sections/personal-information-section";
import { RelativesSection } from "./sections/relatives-section";
import { ReviewSection } from "./sections/review-section";
import { StudentPaymentInformationPanel } from "./components/student-payment-information";

const LAST_PAGE_INDEX = 2;

export interface ApplicationMutationClient {
  createDraft(
    token: string,
    values: CreateDraftApplicationInput,
  ): Promise<DraftApplication>;
  updateDraft(
    token: string,
    applicationId: string,
    values: UpdateDraftApplicationInput,
  ): Promise<EditableApplication>;
  submit(
    token: string,
    applicationId: string,
    expectedVersion: number,
  ): Promise<SubmittedApplication>;
}

const defaultMutationClient: ApplicationMutationClient = {
  createDraft: createDraftApplication,
  updateDraft: updateDraftApplication,
  submit: submitApplication,
};

interface ApplicationFormProps {
  readonly application?: EditableApplication;
  readonly context: RegistrationContext;
  readonly mutationClient?: ApplicationMutationClient;
  readonly onReload?: () => void;
  readonly token: string;
}

interface PersistedDraft {
  readonly applicationId: string;
  readonly version: number;
}

function applicationFieldId(name: FieldPath<ApplicationFormValues>): string {
  return `application-field-${name.replaceAll(".", "-")}`;
}

function focusAndScrollToField(
  name: FieldPath<ApplicationFormValues>,
): void {
  const target = document.getElementById(applicationFieldId(name));
  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.focus({ preventScroll: true });
  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }
}

export function ApplicationForm({
  application,
  context,
  mutationClient = defaultMutationClient,
  onReload,
  token,
}: ApplicationFormProps) {
  const form = useForm<ApplicationFormValues>({
    defaultValues: initialFormValues(context, application),
    resolver: zodResolver(
      createDraftApplicationSchema,
    ) as Resolver<ApplicationFormValues>,
    shouldFocusError: true,
  });
  const {
    clearErrors,
    formState: { isDirty },
    getValues,
    handleSubmit,
    reset,
    setError,
  } = form;
  const [currentPage, setCurrentPage] = useState(0);
  const [applicationId, setApplicationId] = useState(application?.id ?? null);
  const [version, setVersion] = useState(application?.version ?? null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [summaryItems, setSummaryItems] = useState<readonly string[]>([]);
  const [generalMessage, setGeneralMessage] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedApplication | null>(null);
  const [pendingFocus, setPendingFocus] =
    useState<FieldPath<ApplicationFormValues> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const requestLock = useRef(false);

  useEffect(() => {
    if (application === undefined) {
      return;
    }

    setApplicationId(application.id);
    setVersion(application.version);
    reset(initialFormValues(context, application));
  }, [application, context, reset]);

  useEffect(() => {
    if (pendingFocus === null) {
      return;
    }

    focusAndScrollToField(pendingFocus);
    setPendingFocus(null);
  }, [currentPage, pendingFocus]);

  const applyValidationIssues = (error: ApiClientError) => {
    const mapped = mapValidationIssues(error.issues);

    for (const [path, messages] of Object.entries(mapped.fieldErrors)) {
      setError(path as FieldPath<ApplicationFormValues>, {
        type: "server",
        message: messages.join(" "),
      });
    }

    setSummaryItems(mapped.summaryItems);
    setGeneralMessage(
      mapped.generalMessages[0] ??
        (mapped.summaryItems.length > 0
          ? "Vui lòng kiểm tra các trường được liệt kê."
          : error.message),
    );

    if (mapped.firstField !== null) {
      const target = mapped.firstField as FieldPath<ApplicationFormValues>;
      const targetPage = mapped.firstField.startsWith("relatives.") ? 1 : 0;

      setCurrentPage(targetPage);
      setPendingFocus(target);
    }
  };

  const handleRequestError = (error: unknown) => {
    setSavedMessage(null);

    if (!(error instanceof ApiClientError)) {
      setGeneralMessage(
        "Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.",
      );
      return;
    }

    if (error.kind === "validation") {
      applyValidationIssues(error);
      return;
    }

    if (error.kind === "conflict") {
      setHasConflict(true);
      setGeneralMessage(
        "Hồ sơ đã được cập nhật ở một phiên khác. Vui lòng tải lại dữ liệu trước khi tiếp tục.",
      );
      return;
    }

    setGeneralMessage(
      error.kind === "network"
        ? "Mất kết nối mạng. Vui lòng kiểm tra kết nối rồi thử lại."
        : "Không thể lưu hồ sơ lúc này. Vui lòng thử lại sau.",
    );
  };

  const persistDraft = async (
    values: ApplicationFormValues,
  ): Promise<PersistedDraft> => {
    clearErrors();
    setSummaryItems([]);
    setGeneralMessage(null);
    setHasConflict(false);

    if (applicationId === null || version === null) {
      const draft = await mutationClient.createDraft(
        token,
        createDraftApplicationSchema.parse(values),
      );
      setApplicationId(draft.id);
      setVersion(draft.version);
      reset(values);

      return {
        applicationId: draft.id,
        version: draft.version,
      };
    }

    if (!isDirty) {
      return { applicationId, version };
    }

    const updated = await mutationClient.updateDraft(
      token,
      applicationId,
      updateDraftApplicationSchema.parse({
        ...values,
        expectedVersion: version,
      }),
    );
    setVersion(updated.version);
    reset(initialFormValues(context, updated));

    return {
      applicationId: updated.id,
      version: updated.version,
    };
  };

  const runLocked = async (operation: () => Promise<void>) => {
    if (requestLock.current) {
      return;
    }

    requestLock.current = true;
    setIsRequesting(true);

    try {
      await operation();
    } catch (error: unknown) {
      handleRequestError(error);
    } finally {
      requestLock.current = false;
      setIsRequesting(false);
    }
  };

  const saveAndContinue = (values: ApplicationFormValues) =>
    runLocked(async () => {
      if (applicationId === null && !isDirty) {
        setGeneralMessage(
          "Vui lòng nhập ít nhất một thông tin trước khi chuyển sang trang sau.",
        );
        return;
      }

      await persistDraft(values);
      setSavedMessage("Đã lưu");
      setCurrentPage((page) => Math.min(page + 1, LAST_PAGE_INDEX));
    });

  const submit = (values: ApplicationFormValues) =>
    runLocked(async () => {
      const persisted = await persistDraft(values);
      const result = await mutationClient.submit(
        token,
        persisted.applicationId,
        persisted.version,
      );

      setVersion(result.version);
      setSubmitted(result);
      setSavedMessage(null);
      setGeneralMessage(null);
      setSummaryItems([]);
      onReload?.();
    });

  const focusFirstInvalidField = (): void => {
    const invalidField = formRef.current?.querySelector<HTMLElement>(
      '[data-field-name][data-invalid="true"]',
    );
    const name = invalidField?.dataset.fieldName;

    if (name !== undefined) {
      focusAndScrollToField(name as FieldPath<ApplicationFormValues>);
    }
  };

  const invalidForm = () => {
    setGeneralMessage(
      "Một số thông tin chưa đúng định dạng. Vui lòng kiểm tra các trường được đánh dấu.",
    );
    requestAnimationFrame(focusFirstInvalidField);
  };

  const continueToNextPage = (): void => {
    const missingFields = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>(
        '[data-field-name][data-required="true"][data-empty="true"]',
      ) ?? [],
    );

    if (missingFields.length > 0) {
      for (const field of missingFields) {
        const name = field.dataset.fieldName;
        if (name === undefined) continue;

        setError(name as FieldPath<ApplicationFormValues>, {
          type: "required",
          message: "Vui lòng điền thông tin bắt buộc này.",
        });
      }

      setGeneralMessage(
        "Vui lòng điền các trường bắt buộc trước khi tiếp tục.",
      );
      const firstName = missingFields[0]?.dataset.fieldName;
      if (firstName !== undefined) {
        focusAndScrollToField(
          firstName as FieldPath<ApplicationFormValues>,
        );
      }
      return;
    }

    void handleSubmit(saveAndContinue, invalidForm)();
  };

  if (submitted !== null) {
    return (
      <div className="grid gap-4">
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>Hồ sơ đã được nộp thành công</AlertTitle>
          <AlertDescription>
            <p>
              Mã tham chiếu hồ sơ: <strong>{submitted.id}</strong>. Hồ sơ hiện ở
              trạng thái chỉ đọc và không thể chỉnh sửa trên giao diện này.
            </p>
            <p className="mt-2">
              {submitted.submissionEmailStatus === "SENT"
                ? "Phiếu dự tuyển Word đã được gửi tới địa chỉ email bạn khai trong hồ sơ."
                : submitted.submissionEmailStatus === "FAILED"
                  ? "Hồ sơ đã được ghi nhận nhưng chưa thể gửi phiếu qua email. Vui lòng liên hệ đơn vị tuyển sinh."
                  : "Phiếu dự tuyển Word đang được hệ thống xử lý để gửi qua email."}
            </p>
          </AlertDescription>
        </Alert>
        <StudentPaymentInformationPanel payment={context.payment} />
      </div>
    );
  }

  const watchedValues = getValues();
  return (
    <FormProvider {...form}>
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-col gap-5"
      >
        {application?.status === "NEEDS_REVISION" && typeof application.latestRevisionReason === "string" ? (
          <Alert>
            <AlertTitle>Hồ sơ cần bổ sung</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{application.latestRevisionReason}</AlertDescription>
          </Alert>
        ) : null}

        {generalMessage === null ? null : (
          <Alert variant={hasConflict ? "destructive" : "default"}>
            <AlertTitle>
              {hasConflict ? "Dữ liệu đã thay đổi" : "Cần kiểm tra lại"}
            </AlertTitle>
            <AlertDescription>
              <p>{generalMessage}</p>
              {summaryItems.length === 0 ? null : (
                <ul className="mt-2 list-disc pl-5">
                  {summaryItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {hasConflict ? (
                <p className="mt-2">
                  Thay đổi chưa lưu trên màn hình có thể bị mất khi tải lại.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        {savedMessage === null ? null : (
          <div
            role="status"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <CheckCircle2Icon aria-hidden="true" />
            {savedMessage}
          </div>
        )}

        <Card className="rounded-2xl sm:rounded-[2rem]">
          <CardContent>
            {currentPage === 0 ? (
              <div className="flex flex-col gap-10">
                <PersonalInformationSection token={token} />
                <EducationSection context={context} />
              </div>
            ) : null}
            {currentPage === 1 ? <RelativesSection /> : null}
            {currentPage === 2 ? (
              <ReviewSection context={context} values={watchedValues} />
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-col items-stretch gap-3 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center min-[480px]:justify-between">
            <div className="grid w-full grid-cols-1 gap-2 min-[480px]:flex min-[480px]:w-auto min-[480px]:flex-wrap">
              {currentPage === 0 ? null : (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full min-[480px]:w-auto"
                  disabled={isRequesting}
                  onClick={() => setCurrentPage((page) => page - 1)}
                >
                  <ArrowLeftIcon data-icon="inline-start" />
                  Trang trước
                </Button>
              )}
              {hasConflict && onReload !== undefined ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full min-[480px]:w-auto"
                  disabled={isRequesting}
                  onClick={onReload}
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  Tải lại hồ sơ
                </Button>
              ) : null}
            </div>

            <div
              className={cn(
                "grid w-full grid-cols-1 gap-2",
                currentPage !== 0 &&
                  "min-[480px]:flex min-[480px]:w-auto min-[480px]:flex-wrap min-[480px]:justify-end",
              )}
            >
              {currentPage < LAST_PAGE_INDEX ? (
                <Button
                  type="button"
                  className="min-h-11 w-full min-[480px]:w-auto"
                  disabled={isRequesting}
                  onClick={continueToNextPage}
                >
                  {isRequesting ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <ArrowRightIcon data-icon="inline-end" />
                  )}
                  Trang sau
                </Button>
              ) : (
                <Button
                  type="button"
                  className="min-h-11 w-full min-[480px]:w-auto"
                  disabled={isRequesting}
                  onClick={handleSubmit(submit, invalidForm)}
                >
                  {isRequesting ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <SendIcon data-icon="inline-start" />
                  )}
                  Nộp hồ sơ
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        <p className="text-xs text-muted-foreground">
          Thông tin được lưu khi bạn chuyển sang trang sau. Hồ sơ chỉ được gửi
          khi bạn nhấn “Nộp hồ sơ”.
        </p>
      </form>
    </FormProvider>
  );
}
