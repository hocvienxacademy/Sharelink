import { downloadApplicationWord } from "@/composition/word-export";
import { createStudentWordExportHandler } from "@/modules/word-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createStudentWordExportHandler(downloadApplicationWord);
