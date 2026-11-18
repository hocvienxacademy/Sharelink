import { createVietnameseWardListHandler } from "@/shared/administrative-divisions/vietnamese-wards-handler";
import { listVietnameseWards } from "@/shared/administrative-divisions/vietnamese-wards";

export const runtime = "nodejs";

export const GET = createVietnameseWardListHandler(listVietnameseWards);
