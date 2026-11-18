"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, type Resolver, useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
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
import { mapValidationIssues } from "./application-error-mapper";
import {
  findFirstInvalidField,
  findMissingRequiredFields,
  focusAndScrollToField,
  type ApplicationFieldName,
} from "./application-form-focus";
import {
  initialFormValues,
  type ApplicationFormValues,
} from "./application-form.types";
import {
  FormProblemAlert,
  RevisionRequestAlert,
  SavedStatus,
} from "./components/application-form-alerts";
import { ApplicationFormNavigation } from "./components/application-form-navigation";
import { ApplicationSubmittedView } from "./components/application-submitted-view";
import { EducationSection } from "./sections/education-section";
import { PersonalInformationSection } from "./sections/personal-information-section";
import { RelativesSection } from "./sections/relatives-section";
import { ReviewSection } from "./sections/review-section";

const LAST_PAGE_INDEX = 2;

const MESSAGES = {
  checkListedFields: "Vui lòng kiểm tra các trường được liệt kê.",
  conflict:
    "Hồ sơ đã được cập nhật ở một phiên khác. Vui lòng tải lại dữ liệu trước khi tiếp tục.",
  invalidFormat:
    "Một số thông tin chưa đúng định dạng. Vui lòng kiểm tra các trường được đánh dấu.",
  missingRequired: "Vui lòng điền các trường bắt buộc trước khi tiếp tục.",
  network: "Mất kết nối mạng. Vui lòng kiểm tra kết nối rồi thử lại.",
  nothingToSave:
    "Vui lòng nhập ít nhất một thông tin trước khi chuyển sang trang sau.",
  requiredField: "Vui lòng điền thông tin bắt buộc này.",
  saveFailed: "Không thể lưu hồ sơ lúc này. Vui lòng thử lại sau.",
  saved: "Đã lưu",
  unexpected: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.",
} as const;

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

/** A new object per request, so asking twice for the same field focuses twice. */
interface FocusRequest {
  readonly field: ApplicationFieldName;
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
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const requestLock = useRef(false);

  // A reloaded application (after a conflict) replaces the local draft state.
  const [syncedApplication, setSyncedApplication] = useState(application);
  if (application !== undefined && application !== syncedApplication) {
    setSyncedApplication(application);
    setApplicationId(application.id);
    setVersion(application.version);
  }
  useEffect(() => {
    if (application !== undefined) {
      reset(initialFormValues(context, application));
    }
  }, [application, context, reset]);

  // Runs after the page holding the field has rendered.
  useEffect(() => {
    if (focusRequest !== null) focusAndScrollToField(focusRequest.field);
  }, [focusRequest]);

  const applyValidationIssues = (error: ApiClientError) => {
    const mapped = mapValidationIssues(error.issues);

    for (const [path, messages] of Object.entries(mapped.fieldErrors)) {
      setError(path as ApplicationFieldName, {
        type: "server",
        message: messages.join(" "),
      });
    }

    setSummaryItems(mapped.summaryItems);
    setGeneralMessage(
      mapped.generalMessages[0] ??
        (mapped.summaryItems.length > 0
          ? MESSAGES.checkListedFields
          : error.message),
    );

    if (mapped.firstField !== null) {
      setCurrentPage(mapped.firstField.startsWith("relatives.") ? 1 : 0);
      setFocusRequest({ field: mapped.firstField as ApplicationFieldName });
    }
  };

  const handleRequestError = (error: unknown) => {
    setSavedMessage(null);

    if (!(error instanceof ApiClientError)) {
      setGeneralMessage(MESSAGES.unexpected);
      return;
    }
    if (error.kind === "validation") {
      applyValidationIssues(error);
      return;
    }
    if (error.kind === "conflict") {
      setHasConflict(true);
      setGeneralMessage(MESSAGES.conflict);
      return;
    }
    setGeneralMessage(
      error.kind === "network" ? MESSAGES.network : MESSAGES.saveFailed,
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
      return { applicationId: draft.id, version: draft.version };
    }

    if (!isDirty) return { applicationId, version };

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
    return { applicationId: updated.id, version: updated.version };
  };

  /** Ignores double clicks while a save or submit is in flight. */
  const runLocked = async (operation: () => Promise<void>) => {
    if (requestLock.current) return;

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
        setGeneralMessage(MESSAGES.nothingToSave);
        return;
      }

      await persistDraft(values);
      setSavedMessage(MESSAGES.saved);
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

  const invalidForm = () => {
    setGeneralMessage(MESSAGES.invalidFormat);
    requestAnimationFrame(() => {
      const field = findFirstInvalidField(formRef.current);
      if (field !== undefined) focusAndScrollToField(field);
    });
  };

  const continueToNextPage = () => {
    const missingFields = findMissingRequiredFields(formRef.current);
    if (missingFields.length === 0) {
      void handleSubmit(saveAndContinue, invalidForm)();
      return;
    }

    for (const name of missingFields) {
      setError(name, { type: "required", message: MESSAGES.requiredField });
    }
    setGeneralMessage(MESSAGES.missingRequired);
    focusAndScrollToField(missingFields[0]);
  };

  if (submitted !== null) {
    return (
      <ApplicationSubmittedView
        submitted={submitted}
        email={getValues("email")}
        payment={context.payment}
      />
    );
  }

  const revisionReason =
    application?.status === "NEEDS_REVISION"
      ? application.latestRevisionReason
      : null;

  return (
    <FormProvider {...form}>
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-col gap-5"
      >
        {typeof revisionReason === "string" && (
          <RevisionRequestAlert reason={revisionReason} />
        )}
        {generalMessage !== null && (
          <FormProblemAlert
            message={generalMessage}
            summaryItems={summaryItems}
            hasConflict={hasConflict}
          />
        )}
        {savedMessage !== null && <SavedStatus message={savedMessage} />}

        <Card className="rounded-2xl sm:rounded-[2rem]">
          <CardContent>
            {currentPage === 0 && (
              <div className="flex flex-col gap-10">
                <PersonalInformationSection token={token} />
                <EducationSection context={context} />
              </div>
            )}
            {currentPage === 1 && <RelativesSection />}
            {currentPage === 2 && (
              <ReviewSection context={context} values={getValues()} />
            )}
          </CardContent>

          <ApplicationFormNavigation
            isFirstPage={currentPage === 0}
            isLastPage={currentPage === LAST_PAGE_INDEX}
            isRequesting={isRequesting}
            onPrevious={() => setCurrentPage((page) => page - 1)}
            onNext={continueToNextPage}
            onSubmit={() => void handleSubmit(submit, invalidForm)()}
            onReload={hasConflict ? onReload : undefined}
          />
        </Card>

        <p className="text-xs text-muted-foreground">
          Thông tin được lưu khi bạn chuyển sang trang sau. Hồ sơ chỉ được gửi
          khi bạn nhấn “Nộp hồ sơ”.
        </p>
      </form>
    </FormProvider>
  );
}
