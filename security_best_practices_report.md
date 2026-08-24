# Báo cáo cảnh báo dependency npm

Ngày đánh giá: 2026-08-19  
Phạm vi: `package.json`, `package-lock.json`, cây dependency đã cài và khả năng cảnh báo có thể được kích hoạt từ mã ứng dụng.  
Phương pháp: `npm audit --json`, `npm audit --omit=dev --json`, `npm explain`, `npm ls --omit=dev`, `npm audit fix --dry-run --json`, tìm kiếm import trực tiếp và kiểm tra cấu hình Prisma.

## Tóm tắt điều hành

Lần đánh giá ban đầu, `npm audit` báo **5 package ở mức High, 0 Critical**. Sau khi cập nhật riêng `js-yaml` và `nanoid`, kết quả còn **3 package High**, đều thuộc cùng một lỗ hổng gốc trong chuỗi Prisma (`deepmerge-ts`, `@prisma/config`, `prisma`).

Không tìm thấy đường khai thác từ request HTTP hiện tại: dự án không import trực tiếp `deepmerge-ts`, `js-yaml` hoặc `nanoid`; các package này nằm trong công cụ cấu hình/build. Rủi ro thực tế hiện được đánh giá **Thấp**, chủ yếu là từ chối dịch vụ đối với tiến trình CLI/build nếu nó xử lý đầu vào độc hại phù hợp.

Hai cảnh báo `js-yaml` và `nanoid` đã được vá bằng phiên bản tương thích. Cảnh báo Prisma chưa có đường nâng cấp chính thức an toàn tại thời điểm kiểm tra; không nên chấp nhận đề xuất hạ Prisma từ 7.9.1 xuống 6.12.0 một cách tự động.

## Bảng tổng hợp

| ID | Package npm đếm | Advisory gốc | Phiên bản hiện tại | Bản vá | Mức npm | Mức thực tế trong dự án |
|---|---|---|---|---|---|---|
| DEP-001 | `deepmerge-ts`, `@prisma/config`, `prisma` | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) / CVE-2026-40345 | `deepmerge-ts@7.1.5`, Prisma `7.9.1` | `deepmerge-ts@8.0.0`; chưa có Prisma tương thích | High | Thấp |
| DEP-002 | `js-yaml` | [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | `4.3.1` | Đã vá | Đã xử lý | Không còn trong audit |
| DEP-003 | `nanoid` | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) / CVE-2026-67213 | `3.3.18` | Đã vá | Đã xử lý | Không còn trong audit |

## Chi tiết phát hiện

### DEP-001 — DeepmergeTS làm cạn stack qua đồ thị object đệ quy

- **Mức advisory:** High; CVSS 8.2.
- **Đường dependency:** `prisma@7.9.1` → `@prisma/config@7.9.1` → `deepmerge-ts@7.1.5`.
- **Điều kiện khai thác:** hai object được merge phải chứa self-reference ở cùng đường thuộc tính. JSON thuần không tạo được cấu trúc vòng này.
- **Bằng chứng dự án:** `prisma.config.ts` chỉ tạo object cấu hình tĩnh và đọc `DATABASE_URL` dạng chuỗi. Không có dữ liệu request hoặc object do người dùng tạo đi vào cấu hình Prisma.
- **Tác động có thể có:** crash/`RangeError` hoặc restart tiến trình Prisma CLI nếu cấu hình/plugin không tin cậy cung cấp object vòng.
- **Đánh giá:** chưa thấy reachable từ runtime web; rủi ro tập trung ở môi trường phát triển, migration và build.
- **Vấn đề với bản vá tự động:** npm đề xuất `prisma@6.12.0`, là hạ major từ Prisma 7 và có nguy cơ phá schema/config/generated client. Phiên bản Prisma mới nhất được registry trả về tại thời điểm đánh giá vẫn là `7.9.1` và vẫn dùng `@prisma/config@7.9.1`.
- **Khuyến nghị:** không chạy `npm audit fix --force`; theo dõi bản Prisma cập nhật `deepmerge-ts >=8`, sau đó nâng đồng bộ `prisma`, `@prisma/client` và adapter, chạy validate/generate/test/migration verification.

### DEP-002 — JS-YAML tiêu thụ CPU bậc hai khi xử lý `!!omap`

- **Mức advisory:** High; CVSS 7.5.
- **Đường dependency:** `shadcn@4.16.0` → `cosmiconfig@9.0.2` → `js-yaml@4.3.0`.
- **Điều kiện khai thác:** tiến trình phải parse YAML do kẻ tấn công kiểm soát có cấu trúc `!!omap` lớn.
- **Bằng chứng dự án:** không có import `js-yaml` trong `src/` hoặc `scripts/`; package chỉ xuất hiện qua CLI shadcn. Ứng dụng không có API nhận và parse YAML.
- **Tác động có thể có:** block event loop/CPU exhaustion trong tiến trình đang parse YAML.
- **Đánh giá:** không reachable từ ứng dụng web hiện tại; rủi ro thấp và thuộc công cụ phát triển.
- **Trạng thái:** đã nâng dependency gián tiếp lên `js-yaml@4.3.1`; advisory không còn xuất hiện trong `npm audit`.

### DEP-003 — Nano ID có thể lặp vô hạn với custom generator size bằng 0

- **Mức advisory:** npm đánh dấu High; advisory yêu cầu điều kiện cấu hình cụ thể.
- **Đường dependency:** `next@16.3.0`/`@tailwindcss/postcss`/`shadcn` → `postcss` → `nanoid@3.3.16`.
- **Điều kiện khai thác:** mã phải gọi `customAlphabet` hoặc `customRandom` với kích thước `0`, và giá trị này phải bị ảnh hưởng bởi đầu vào không tin cậy.
- **Bằng chứng dự án:** không có import hoặc lệnh gọi `nanoid` trực tiếp. Nó được PostCSS dùng trong chuỗi build; không có đường dữ liệu từ request tới custom generator.
- **Tác động có thể có:** vòng lặp vô hạn và từ chối dịch vụ trên thread gọi hàm.
- **Đánh giá:** không reachable trong mã ứng dụng đã kiểm tra; rủi ro thực tế thấp.
- **Trạng thái:** đã cập nhật dependency gián tiếp lên `nanoid@3.3.18`; advisory không còn xuất hiện trong `npm audit`.

## Vì sao `--omit=dev` vẫn báo 5 cảnh báo

- `shadcn` hiện nằm trong `dependencies`, nên `js-yaml` vẫn thuộc cây production.
- `@prisma/client` có peer optional tới `prisma`, khiến Prisma CLI/config vẫn xuất hiện trong cây cài production hiện tại.
- Next.js mang PostCSS và Nano ID trong cây package, dù đường dễ thấy nhất của chúng là build/transform CSS.

Điều này cho thấy việc phân loại dependency production/dev cần được làm sạch, nhưng không tự chứng minh rằng các hàm dễ tổn thương được bundle hoặc gọi từ request runtime.

## Kế hoạch xử lý đề xuất

1. **Đã hoàn thành:** lockfile sử dụng `js-yaml@4.3.1` và `nanoid@3.3.18`.
2. **Prisma:** tạm chấp nhận có thời hạn DEP-001 vì chưa có bản Prisma 7 tương thích; theo dõi upstream và rà lại định kỳ. Không downgrade/force-fix.
3. **CI:** thêm audit gate có chính sách ngoại lệ theo advisory ID và ngày hết hạn, thay vì bỏ qua toàn bộ cảnh báo High.

## Giới hạn và kết luận

Đây là đánh giá dependency và reachability tĩnh, không phải kiểm thử khai thác trên môi trường production. Không có bằng chứng về rò rỉ dữ liệu, sửa đổi dữ liệu hoặc thực thi mã từ các advisory này; tác động được mô tả đều tập trung vào availability. Bản vá chỉ cập nhật hai dependency gián tiếp trong `package-lock.json`, không dùng `--force` và không thay đổi Prisma.

## Kiểm chứng sau bản vá

- `npm ls js-yaml nanoid`: xác nhận `js-yaml@4.3.1` và `nanoid@3.3.18`.
- `npm audit --json`: còn 3 mục High, đều quy về DEP-001; DEP-002 và DEP-003 không còn xuất hiện.
- `npm run type-check`: đạt.
- `npm test`: đạt 296/296 test.
- `npm run build`: production build đạt.
- `npm run prisma:validate`: schema hợp lệ.
- `npm run audit:policy`: chặn promotion vì DEP-001 chưa có waiver được phê duyệt. Đây là trạng thái dự kiến của cảnh báo Prisma còn lại, không phải hồi quy do hai bản vá.
