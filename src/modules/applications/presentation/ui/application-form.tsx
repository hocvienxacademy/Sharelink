"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  SaveIcon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
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
import { StudentWordDownload } from "@/modules/word-export/presentation/ui/student-word-download";

const steps = [
  { title: "Thông tin cá nhân", shortTitle: "Cá nhân" },
  { title: "Học vấn", shortTitle: "Học vấn" },
  { title: "Người thân", shortTitle: "Người thân" },
  { title: "Xem lại", shortTitle: "Xem lại" },
] as const;

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
  readonly onSubmitted?: (result: SubmittedApplication) => void;
  readonly token: string;
}

interface PersistedDraft {
  readonly applicationId: string;
  readonly version: number;
}

export function ApplicationForm({
  application,
  context,
  mutationClient = defaultMutationClient,
  onReload,
  onSubmitted,
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
  const [currentStep, setCurrentStep] = useState(0);
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

    document
      .getElementById(
        `application-field-${pendingFocus.replaceAll(".", "-")}`,
      )
      ?.focus();
    setPendingFocus(null);
  }, [currentStep, pendingFocus]);

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
      const targetStep = mapped.firstField.startsWith("relatives.")
        ? 2
        : [
              "majorId",
              "entryQualification",
              "admissionDiploma",
              "graduateMajor",
              "graduationYear",
              "highSchoolName",
              "highSchoolWard",
              "highSchoolProvince",
              "declarationPlace",
              "declarationDate",
              "declarationConfirmed",
              "dataProcessingConsent",
            ].includes(mapped.firstField)
          ? 1
          : 0;

      setCurrentStep(targetStep);
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

  const save = (values: ApplicationFormValues, continueAfterSave: boolean) =>
    runLocked(async () => {
      if (applicationId === null && !isDirty) {
        setGeneralMessage(
          "Vui lòng nhập ít nhất một thông tin trước khi lưu bản nháp.",
        );
        return;
      }

      await persistDraft(values);
      setSavedMessage("Đã lưu");

      if (continueAfterSave) {
        setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
      }
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
      onSubmitted?.(result);
      onReload?.();
    });

  const invalidForm = () => {
    setGeneralMessage(
      "Một số thông tin chưa đúng định dạng. Vui lòng kiểm tra các trường được đánh dấu.",
    );
  };

  if (submitted !== null) {
    return (
      <div className="grid gap-4">
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>Hồ sơ đã được nộp thành công</AlertTitle>
          <AlertDescription>
            Mã tham chiếu hồ sơ: <strong>{submitted.id}</strong>. Hồ sơ hiện ở
            trạng thái chỉ đọc và không thể chỉnh sửa trên giao diện này.
          </AlertDescription>
        </Alert>
        <StudentWordDownload
          token={token}
          initialCode={submitted.downloadCode}
          payment={context.payment}
        />
      </div>
    );
  }

  const watchedValues = getValues();
  const progressValue = ((currentStep + 1) / steps.length) * 100;

  return (
    <FormProvider {...form}>
      <form
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
        <div className="flex flex-col gap-3">
          <Progress value={progressValue}>
            <ProgressLabel>
              Bước {currentStep + 1}: {steps[currentStep].title}
            </ProgressLabel>
            <ProgressValue />
          </Progress>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            aria-label="Các bước của hồ sơ"
          >
            {steps.map((step, index) => (
              <Button
                key={step.title}
                type="button"
                size="sm"
                variant={index === currentStep ? "default" : "outline"}
                aria-label={`Bước ${index + 1}: ${step.title}`}
                aria-current={index === currentStep ? "step" : undefined}
                onClick={() => setCurrentStep(index)}
                disabled={isRequesting}
              >
                <span className="sm:hidden">{index + 1}</span>
                <span className="hidden sm:inline">{step.shortTitle}</span>
              </Button>
            ))}
          </div>
        </div>

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
            {currentStep === 0 ? <PersonalInformationSection /> : null}
            {currentStep === 1 ? (
              <EducationSection context={context} />
            ) : null}
            {currentStep === 2 ? <RelativesSection /> : null}
            {currentStep === 3 ? (
              <ReviewSection context={context} values={watchedValues} />
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              {currentStep === 0 ? null : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isRequesting}
                  onClick={() => setCurrentStep((step) => step - 1)}
                >
                  <ArrowLeftIcon data-icon="inline-start" />
                  Quay lại
                </Button>
              )}
              {hasConflict && onReload !== undefined ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isRequesting}
                  onClick={onReload}
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  Tải lại hồ sơ
                </Button>
              ) : null}
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
              {currentStep < steps.length - 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isRequesting}
                    onClick={handleSubmit(
                      (values) => save(values, false),
                      invalidForm,
                    )}
                  >
                    {isRequesting ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <SaveIcon data-icon="inline-start" />
                    )}
                    Lưu bản nháp
                  </Button>
                  <Button
                    type="button"
                    disabled={isRequesting}
                    onClick={handleSubmit(
                      (values) => save(values, true),
                      invalidForm,
                    )}
                  >
                    {isRequesting ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <ArrowRightIcon data-icon="inline-end" />
                    )}
                    Lưu và tiếp tục
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
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
          Hồ sơ chỉ được gửi khi bạn nhấn “Nộp hồ sơ”. Không có lưu tự động.
        </p>
      </form>
    </FormProvider>
  );
}
