import { createVietnameseWardListHandler } from "@/shared/administrative-divisions/vietnamese-wards-handler";
import { fetchVietnameseWards } from "@/shared/administrative-divisions/vietnamese-wards";

export const runtime = "nodejs";

export const GET = createVietnameseWardListHandler(fetchVietnameseWards);
