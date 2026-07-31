import {
  getEditableApplication,
  updateDraftApplication,
} from "@/composition/index";
import {
  createGetEditableApplicationHandler,
  createUpdateDraftApplicationHandler,
} from "@/modules/applications/presentation/http/application-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createGetEditableApplicationHandler(
  getEditableApplication,
);
export const PATCH = createUpdateDraftApplicationHandler(
  updateDraftApplication,
);
