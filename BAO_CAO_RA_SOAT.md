# Báo cáo rà soát dự án ShareLinkStudent

Ngày rà soát: 2026-10-14 · Nhánh: `review/project-analysis` · Commit gốc: `5e4af16`

## 1. Kết luận nhanh

| Hạng mục | Kết quả |
| --- | --- |
| Biên dịch TypeScript (`tsc --noEmit`) | **Đạt** (0 lỗi) |
| Prisma schema (`validate`, `generate`) | **Đạt** |
| Build production (`npm run build`) | **Đạt** (toàn bộ route sinh ra, \~22 giây) |
| Unit test (`npm test`) | **314/322 đạt, 8 lỗi** (xem mục 4) |
| Integration test (43 case) | **Chưa chạy được** – máy không có PostgreSQL |
| E2E Playwright (26 case) | **Chưa chạy được** – cần PostgreSQL + trình duyệt |
| Chạy app thật | **Chưa xác minh** – không có `.env`, không có DB |
| Lint | **Không chạy được** – có `eslint.config.js` nhưng `eslint` không có trong `package.json` |
| `npm audit` | 25 lỗ hổng (2 critical, 19 high, 4 moderate), trong đó có `next` **và** `nodemailer` **là phụ thuộc trực tiếp** |

Dự án ở giai đoạn **gần hoàn thiện, đã có cấu hình triển khai Render**; chức năng nghiệp vụ chính đã code xong, nhưng có 3 vấn đề chặn việc triển khai/CI sạch: cấu hình Render thiếu biến môi trường bắt buộc, test lỗi thời, và phụ thuộc có lỗ hổng.

## 2. Dự án làm gì

Ứng dụng web Next.js 16 + React 19 + Prisma 7 + PostgreSQL cho quy trình **đăng ký tuyển sinh qua đường link** của Đại học Trà Vinh:

1. Nhân viên (SALE/MANAGER/ADMIN) tạo **liên kết đăng ký** (`/quan-tri/lien-ket`) gắn ngành, kỳ tuyển sinh, học phí.
2. Sinh viên mở `/dang-ky/[token]`, điền **phiếu dự tuyển** (thông tin cá nhân, CCCD, địa chỉ có gợi ý VietMap, học vấn, người thân), lưu nháp và **nộp hồ sơ**.
3. Hệ thống tự **xuất phiếu Word** (`docxtemplater`) và **gửi email** (SMTP) kèm file; hiển thị thông tin chuyển khoản/QR.
4. Nhân viên **xác nhận/huỷ thanh toán**, **kiểm tra hợp lệ**, **yêu cầu bổ sung**, tải Word; mọi thay đổi có **lịch sử và audit log**.
5. ADMIN quản lý nhân sự, vai trò, ngành, kỳ tuyển sinh, tài khoản ngân hàng, cài đặt hệ thống (phí hồ sơ…), nhật ký.

Vai trò: `SALE`, `MANAGER`, `ADMIN`. 20 trang, \~75 API route. Kiến trúc module sạch (domain / application / infrastructure / presentation), có khoá lạc quan (`version`, `expectedUpdatedAt`), giao dịch DB, rate-limit Redis, CSP có nonce, kiểm tra same-origin, che PII trong log.

## 3. Điểm tốt

- Kiến trúc phân lớp rõ ràng, không dùng `any`, không còn TODO/FIXME, không `console.log` trong `src`.
- Nộp hồ sơ dùng cập nhật có điều kiện `status + version` trong transaction → chống nộp trùng/ghi đè.
- Đăng nhập: băm mật khẩu, khoá tài khoản sau N lần sai, phiên lưu DB bằng hash SHA-256 của token, 8 giờ.
- Chính sách đổi đường dẫn DB: có `docs/deployment`, `docs/security` khá đầy đủ, CI có quality gate.

## 4. Lỗi và vấn đề đã xác minh

### 4.1 Nghiêm trọng – chặn triển khai

**L1.** `render.yaml` **thiếu biến môi trường bắt buộc → app production không khởi động được.**`src/instrumentation.ts` gọi `validateRuntimeEnvironment()` lúc khởi động; hàm này yêu cầu `VIETMAP_API_KEY` (`runtime-environment.ts:236`) và toàn bộ `SMTP_*` (`validateSmtpEnvironment`, dòng 289). `render.yaml` **không khai báo** các biến này (chỉ có trong `.env.production.example`). Triển khai bằng Blueprint sẽ lỗi "Missing required environment variable: VIETMAP_API_KEY" cho đến khi người vận hành tự thêm tay. → Sửa: thêm `VIETMAP_API_KEY`, `SMTP_HOST/PORT/SECURE/REQUIRE_TLS/USER/PASSWORD/FROM_NAME/FROM_EMAIL` (`sync: false`) vào `render.yaml`; cập nhật `docs/deployment/environment-variables.md`.

**L2. Phụ thuộc có lỗ hổng (production, trực tiếp).**

- `next@16.3.0` (lockfile) nằm trong dải bị ảnh hưởng đến `<16.3.8`: RCE Image Optimization (AVIF), SSRF Image Optimization, cache poisoning SSG/ISR, RCE `next/og`… Mức critical. RCE "windows-hosted" không ảnh hưởng Render (Linux) nhưng các lỗi còn lại thì có.
- `nodemailer@10.0.1` (`<10.0.9`): lộ credential SMTP giữa các transport (cache DNS toàn cục), DoS parser địa chỉ.
- `proxy-addr` (critical, giả mạo IP) – gián tiếp qua Next; ảnh hưởng độ tin cậy của rate-limit theo IP. → Sửa: nâng `next` ≥ 16.3.8, `nodemailer` ≥ 10.0.9, rồi `npm audit` lại. Lưu ý job CI `audit:policy` có thể đã đỏ vì lý do này.

**L3. Ràng buộc Node: máy hiện tại là Node 22.11.0, dự án yêu cầu** `>=22 <23` **nhưng Prisma 7.9.1 đòi** `>=22.12`**.**`npm ci` thất bại ở bước `preinstall` của Prisma, và `prisma` CLI lỗi `ERR_REQUIRE_ESM`. Tôi phải cài bằng `--ignore-scripts` và đặt `NODE_OPTIONS=--experimental-require-module` để chạy tiếp. → Sửa: nâng Node lên 22.12+ (khuyến nghị 22 LTS mới nhất) và đổi `engines` thành `>=22.12 <23`.

### 4.2 Trung bình – test lỗi thời / logic

**L4. 7 unit test cấu hình môi trường thất bại** (`src/shared/config/runtime-environment.test.ts`, test số 75–80, 82). Nguyên nhân: commit `1dff7e2` (2026-09-10) thêm `VIETMAP_API_KEY` và `SMTP_*` làm bắt buộc nhưng **không cập nhật fixture test** (`validDevelopmentEnvironment`, `validStagingEnvironment`, `validProductionEnvironment`). Đây là test hỏng thật, không phải do môi trường máy. → Sửa: thêm các biến này vào 3 fixture.

**L5. 1 unit test form kỳ tuyển sinh thất bại** (`catalog-management-panels.test.tsx`, "resets the admission-period form…"). Test gõ ngày vào `<input>`, nhưng UI đã đổi sang `DatePicker` (calendar) nên `createStartDate/EndDate` luôn `null` và form báo "Vui lòng chọn đủ ngày…". Test lỗi thời sau commit `6246e5e`. → Sửa: viết lại test thao tác qua DatePicker; nên bổ sung test cho luồng chỉnh sửa (`submitEdit`).

**L6. Email xác nhận gửi đồng bộ trong request nộp hồ sơ, không có cơ chế gửi lại.**`SubmitApplication.dispatchSubmissionEmail` sinh Word + gửi SMTP ngay trong request (timeout socket 15s). Nếu SMTP chậm/lỗi: người dùng chờ lâu; trạng thái `FAILED` chỉ hiển thị, **không có nút gửi lại hay job retry** (code tự ghi chú "future retry/outbox worker"). Commit `ed8d760` đã gỡ mã tải Word công khai nên sinh viên không tự lấy lại phiếu được, chỉ còn cách liên hệ đơn vị. Ngoài ra, nếu cập nhật trạng thái thất bại sau khi gửi, hồ sơ kẹt ở `PENDING` vĩnh viễn. → Sửa: thêm hành động "gửi lại email" cho nhân viên; về lâu dài dùng outbox + worker.

### 4.3 Thấp – chất lượng / bảo trì

- **L7.** `README.md` **rỗng (0 byte)**; `docs/api`, `docs/architecture`, `docs/business-rules` chỉ có `.gitkeep`. `AGENTS.md` còn ghi "chưa có script lint/test/build" – đã sai.
- **L8.** `eslint.config.js` và `prettier.config.js` tồn tại nhưng `eslint`/`prettier` không có trong `devDependencies`, không có script `lint` → không có kiểm tra lint nào chạy, kể cả trong CI.
- **L9.** Nhiều file UI viết một dòng rất dài (ví dụ `catalog-management-panels.tsx`, `MajorManagementPanel`) → khó review, dễ sót lỗi, không thống nhất với phần còn lại của repo.
- **L10.** Thư mục thừa từ kiến trúc cũ: `src/views/*` và `src/public/*` chỉ chứa `.gitkeep` (trừ `logoTVU.jpg`).
- **L11.** Vẫn còn thư mục `Sharelink/` rỗng bị Windows giữ khoá sau khi di chuyển – cần xoá thủ công.
- **L12.** CSRF dựa vào kiểm tra `Origin`/Fetch Metadata + `SameSite=Lax`, không có token (đã ghi nhận trong `docs/security/admin-csrf-assessment.md`) – chấp nhận được nhưng cần giữ nguyên tắc không chuyển sang `SameSite=None`.
- **L13.** `render.yaml` dùng gói `free` cho cả web và DB: DB free của Render bị xoá sau thời hạn và web ngủ khi rảnh – không phù hợp vận hành thật.

## 5. Độ phủ test (tĩnh)

| Module | File nguồn | File test |
| --- | --- | --- |
| applications | 45 | 17 |
| catalogs | 25 | 6 |
| registration-links | 22 | 6 |
| users | 17 | 6 |
| payments | 11 | 4 |
| dashboard | 10 | 2 |
| system-settings | 10 | 3 |
| auth | 7 | 2 |
| word-export | 6 | 3 |
| audit-logs | 2 | 0 |

Ngoài ra: 43 case integration (repository + ràng buộc CHECK + migration) và 26 case E2E (đăng nhập, luồng nộp hồ sơ, thanh toán, phân quyền link, responsive). Phần **integration/E2E chưa được chạy trong đợt rà soát này** nên chưa kết luận được chúng đạt hay không.

## 6. Việc nên làm (theo thứ tự)

1. Nâng Node ≥ 22.12 trên máy dev; đổi `engines`.
2. Nâng `next` ≥ 16.3.8 và `nodemailer` ≥ 10.0.9; chạy lại `npm audit`.
3. Bổ sung `VIETMAP_API_KEY` + `SMTP_*` vào `render.yaml`.
4. Sửa 8 unit test lỗi (L4, L5).
5. Dựng PostgreSQL test (`npm run test:db:prepare`) rồi chạy `test:integration` và `test:e2e` để có kết quả đầy đủ.
6. Thêm chức năng gửi lại email xác nhận (L6).
7. Viết README, thêm `eslint`/`prettier` và script `lint`, dọn thư mục thừa.

## 7. Cách tái hiện kết quả trên máy này

```powershell
# vì Node 22.11 < 22.12
npm ci --ignore-scripts
$env:NODE_OPTIONS = "--experimental-require-module --no-warnings"
$env:DATABASE_URL = "postgresql://postgres:x@localhost:5432/student_registration_placeholder"
npx prisma generate
npx tsc --noEmit
npm test
npm run build
```