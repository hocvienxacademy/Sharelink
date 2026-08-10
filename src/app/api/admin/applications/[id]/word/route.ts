import { downloadApplicationWord } from "@/composition/word-export";
import { createStaffWordExportHandler } from "@/modules/word-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createStaffWordExportHandler(downloadApplicationWord);
