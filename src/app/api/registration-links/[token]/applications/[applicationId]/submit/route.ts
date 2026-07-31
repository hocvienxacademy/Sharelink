import { submitApplication } from "@/composition/index";
import { createSubmitApplicationHandler } from "@/modules/applications/presentation/http/application-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createSubmitApplicationHandler(submitApplication);
