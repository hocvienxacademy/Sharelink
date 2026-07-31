import { createDraftApplication } from "@/composition/index";
import { createCreateDraftApplicationHandler } from "@/modules/applications/presentation/http/application-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createCreateDraftApplicationHandler(
  createDraftApplication,
);
