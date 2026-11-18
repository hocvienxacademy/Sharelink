# Đặc tả nghiệp vụ ShareLinkStudent (bản suy luận từ code)

> **Trạng thái: NHÁP, chưa được nghiệp vụ xác nhận**.Tài liệu này được suy luận từ `prisma/schema.prisma`, mã nguồn `src/`, các migration, `docs/security/admin-authorization-matrix.md` và `src/modules/applications/SUBMISSION.md`. Cần người nghiệp vụ rà soát và sửa theo thực tế trước khi chốt luồng cuối cùng.

## Cách đọc nhãn độ tin cậy

| Nhãn | Ý nghĩa |
| --- | --- |
| **\[ĐÃ CÓ\]** | Có trong code và/hoặc tài liệu đã ghi "Confirmed". Vẫn cần bạn xác nhận lại với thực tế |
| **\[SUY LUẬN\]** | Suy ra từ schema/enum/test, chưa thấy được code thực thi đầy đủ |
| **\[CHƯA RÕ\]** | Có dấu vết nhưng không có quy tắc. Cần bạn quyết định |
| **\[THIẾU\]** | Schema có chỗ chứa nhưng code không làm. Cần quyết định có làm hay bỏ |

## 1. Mục đích

Nhân viên tuyển sinh (SALE) tạo **liên kết đăng ký** cho từng sinh viên. Sinh viên mở liên kết, điền **hồ sơ đăng ký xét tuyển**, nộp, nhận email kèm phiếu Word. Quản lý/Quản trị viên duyệt hồ sơ và xác nhận thanh toán phí. Mọi thay đổi nhạy cảm đều có lịch sử và nhật ký kiểm toán. **\[ĐÃ CÓ\]**

## 2. Vai trò

| Vai trò | Mô tả suy ra từ code | Độ tin cậy |
| --- | --- | --- |
| `SALE` | Tạo và quản lý liên kết của mình. Chỉ xem hồ sơ, thanh toán của liên kết mình. Không sửa/duyệt hồ sơ | ĐÃ CÓ |
| `MANAGER` | Quản lý các SALE trực tiếp (`users.manager_id`). Sửa nội dung, yêu cầu chỉnh sửa, duyệt hồ sơ, xác nhận/hủy xác nhận thanh toán trong phạm vi nhân viên mình quản lý. Không tạo/sửa liên kết | ĐÃ CÓ |
| `ADMIN` | Toàn quyền trong hệ thống: người dùng, danh mục, cài đặt, mọi hồ sơ/liên kết | ĐÃ CÓ |
| Sinh viên | Không có tài khoản. Truy cập bằng `public_token` trên liên kết và `applicationId` | ĐÃ CÓ |

Phạm vi quản lý chỉ 1 cấp (MANAGER → SALE). Nhiều cấp quản lý đang bị từ chối có chủ đích. **\[ĐÃ CÓ\]**

## 3. Thực thể chính

| Bảng | Vai trò | Ghi chú |
| --- | --- | --- |
| `users` | Tài khoản nhân viên | `username` đăng nhập, khóa sau nhiều lần sai |
| `registration_links` | Liên kết đăng ký | Gắn với 1 SALE, ngành, kỳ tuyển sinh, học phí, hạn dùng |
| `applications` | Hồ sơ của sinh viên | Quan hệ 1–1 với liên kết (`registration_link_id` unique) |
| `application_relatives` | Người thân (tối đa 2) | `position` 1–2 |
| `application_status_histories` | Lịch sử trạng thái hồ sơ |  |
| `registration_link_status_histories` | Lịch sử trạng thái liên kết |  |
| `payment_confirmations` | Xác nhận thanh toán | 1–1 với hồ sơ |
| `bank_accounts` | Tài khoản ngân hàng nhận tiền | Tối đa 1 tài khoản mặc định |
| `majors`, `admission_periods` | Danh mục ngành, kỳ tuyển sinh |  |
| `system_settings` | Cài đặt (phí hồ sơ, hướng dẫn thanh toán) |  |
| `audit_logs` | Nhật ký kiểm toán | Không chép đầy đủ PII |
| `application_export_credentials` | Mã tải Word cho sinh viên | **Xem mục 9, có vẻ không còn dùng** |
| `app_sessions` | Phiên đăng nhập nhân viên | Cookie `sls_admin_session`, 8 giờ |

## 4. Luồng chính (đầu-cuối)

```
SALE tạo liên kết (DRAFT)
   └─ kích hoạt → ACTIVE  ──► gửi URL cho sinh viên
                                   │
Sinh viên mở URL ──► tạo hồ sơ (DRAFT) ──► điền/sửa ──► nộp (SUBMITTED)
                                                          │
                              email xác nhận + phiếu Word (SENT / FAILED)
                                                          │
                       MANAGER/ADMIN xem xét hồ sơ SUBMITTED
                        ├─ yêu cầu chỉnh sửa → NEEDS_REVISION ─► sinh viên sửa, nộp lại
                        └─ hợp lệ → VALID
                                                          │
                       MANAGER/ADMIN xác nhận thanh toán (PENDING → CONFIRMED)
                        └─ có thể hủy xác nhận (CONFIRMED → CANCELLED, kèm lý do)

UPDATE:
```

Chi tiết từng bước ở các mục 5–8.

## 5. Liên kết đăng ký

### 5.1 Trạng thái và chuyển đổi **\[ĐÃ CÓ\]**

| Hành động | Từ | Đến | Điều kiện |
| --- | --- | --- | --- |
| `activate` | DRAFT | ACTIVE | Hạn dùng còn hiệu lực (hoặc không đặt hạn); kỳ tuyển sinh đang hoạt động |
| `lock` | ACTIVE | LOCKED |  |
| `unlock` | LOCKED | ACTIVE | Chưa hết hạn |
| `cancel` | DRAFT / ACTIVE / LOCKED | CANCELLED | **Chưa có hồ sơ nào** gắn với liên kết |
| `archive` | CANCELLED / EXPIRED | ARCHIVED | Không có chiều ngược lại |

- `EXPIRED` và `SUBMITTED` có trong enum nhưng **không có hành động nào đặt được**. Hết hạn được tính theo thời gian khi kiểm tra truy cập, chưa có tiến trình tự động chuyển trạng thái. **\[THIẾU\]**
- Mỗi lần chuyển, hệ thống khóa dòng, kiểm tra trạng thái và `updated_at` mong đợi (chống ghi đè đồng thời), ghi lịch sử và nhật ký trong cùng giao dịch.

### 5.2 Tạo liên kết **\[ĐÃ CÓ\]**

- SALE: chủ sở hữu luôn là chính SALE đó (server quyết định).
- ADMIN: chọn một SALE đang hoạt động làm chủ sở hữu.
- MANAGER: **không** được tạo hay sửa liên kết.
- Sửa chi tiết: chỉ khi liên kết còn DRAFT và chưa có hồ sơ.
- Các trường: `student_name_hint`, ngành (`major_id`), kỳ tuyển sinh, đối tượng đầu vào (`entry_qualification`), `tuition_amount`, `payment_round`(mặc định `D1`), `internal_note`, `expires_at`.

### 5.3 Truy cập công khai **\[ĐÃ CÓ\]**

Sinh viên chỉ vào được khi liên kết ở trạng thái **ACTIVE** và chưa hết hạn. Ngược lại hệ thống trả "không tìm thấy" (không tiết lộ lý do). URL chỉ được sao chép khi liên kết ACTIVE.

### 5.4 Điểm chưa rõ

- **\[CHƯA RÕ\]** `access_count` và `last_accessed_at` chưa bao giờ được cập nhật (SUBMISSION.md ghi: ý nghĩa chưa được chốt).
- **\[THIẾU\]** Nộp hồ sơ **không** đổi trạng thái liên kết sang SUBMITTED, dù schema có `submitted_at`, `locked_at`, `locked_by`. Quyết định: liên kết sau khi nộp giữ ACTIVE hay chuyển SUBMITTED?
- **\[CHƯA RÕ\]** Một liên kết chỉ có tối đa 1 hồ sơ. Sinh viên nộp sai thì sửa qua NEEDS_REVISION, không tạo hồ sơ thứ hai. Có đúng thực tế không?

## 6. Hồ sơ sinh viên

### 6.1 Trạng thái **\[ĐÃ CÓ\] phần đã triển khai, \[THIẾU\] phần còn lại**

Enum `application_status`: `DRAFT, SUBMITTED, WAITING_PAYMENT, PAYMENT_CONFIRMED, NEEDS_REVISION, VALID, PRINTED, COMPLETED, CANCELLED`.

Đồ thị chuyển đổi **đang hoạt động trong code**:

| Từ | Đến | Ai | Cách |
| --- | --- | --- | --- |
| (mới) | DRAFT | Sinh viên | Tạo hồ sơ qua liên kết ACTIVE |
| DRAFT | SUBMITTED | Sinh viên | Nộp, đủ thông tin |
| NEEDS_REVISION | SUBMITTED | Sinh viên | Nộp lại sau khi sửa |
| SUBMITTED | NEEDS_REVISION | MANAGER (trong phạm vi) / ADMIN | Yêu cầu chỉnh sửa, kèm lý do |
| SUBMITTED | VALID | MANAGER (trong phạm vi) / ADMIN | Xác nhận hợp lệ, hồ sơ phải đủ thông tin |

**Các trạng thái chưa có cách đi tới trong code:** `WAITING_PAYMENT`, `PAYMENT_CONFIRMED`, `PRINTED`, `COMPLETED`, `CANCELLED`. **VALID hiện là điểm cuối.** **\[THIẾU\]** Cần quyết định có dùng hay bỏ khỏi enum (xem mục 10).

### 6.2 Ai sửa được gì **\[ĐÃ CÓ\]**

| Hành động | Sinh viên | SALE | MANAGER | ADMIN |
| --- | --- | --- | --- | --- |
| Xem | Hồ sơ của mình | Của liên kết mình | Của SALE mình quản lý | Tất cả |
| Sửa nội dung | DRAFT, NEEDS_REVISION | Không | DRAFT, SUBMITTED, NEEDS_REVISION | Như MANAGER, toàn hệ thống |
| Nộp / nộp lại | DRAFT, NEEDS_REVISION | Không | Không | Không |
| Yêu cầu chỉnh sửa | Không | Không | SUBMITTED | SUBMITTED |
| Xác nhận hợp lệ | Không | Không | SUBMITTED | SUBMITTED |
| Tải phiếu Word | Không (xem mục 9) | Có | Có | Có |

Sửa bởi nhân viên không đổi trạng thái. Mọi thao tác dùng `version`(khóa lạc quan): đọc version cũ thì trả 409.

### 6.3 Điều kiện đủ để nộp / xác nhận hợp lệ **\[ĐÃ CÓ\]**

Bắt buộc (không trống): họ tên, ngày sinh, giới tính, nơi sinh, dân tộc, tôn giáo, quốc tịch, số điện thoại, CCCD, ngày cấp, nơi cấp, địa chỉ thường trú, địa chỉ liên hệ, email, bằng tốt nghiệp xét tuyển, ngành tốt nghiệp, năm tốt nghiệp, tên trường THPT, xã/phường, tỉnh/thành, ngành đăng ký, đối tượng đầu vào.

Người thân: tối đa 2 (vị trí 1–2, không trùng). **Hiện không bắt buộc có người thân nào** (`minimumRelatives = 0`), nhưng nếu khai một người thì phải đủ 5 trường (họ tên, quan hệ, nghề nghiệp, SĐT, địa chỉ) và không được để trống hoàn toàn. **\[CHƯA RÕ\]** Thực tế có yêu cầu tối thiểu 1–2 người thân không?

Ràng buộc từ liên kết: nếu liên kết cố định ngành hoặc đối tượng đầu vào, hồ sơ phải khớp và sinh viên không đổi được. Ngành phải đang hoạt động.

Còn có: xác nhận cam đoan (`declaration_confirmed`), đồng ý xử lý dữ liệu (`data_processing_consent`), nơi/ngày khai (`declaration_place/date`). **\[CHƯA RÕ\]** Hai cờ xác nhận có bắt buộc `true` khi nộp không (chính sách kiểm tra ở trên chưa kiểm tra chúng, cần kiểm tra thêm schema nhập liệu).

### 6.4 Mã hồ sơ **\[THIẾU\]**

`application_code` là cột có ràng buộc unique, được hiển thị và dùng đặt tên file Word, nhưng **không có đoạn code nào sinh mã này**. Khi trống, hệ thống dùng 8 ký tự đầu của UUID. Cần chốt quy tắc mã (ví dụ theo kỳ + số thứ tự).

## 7. Nộp hồ sơ và email

1. Server kiểm tra liên kết, phiên bản hồ sơ, ngành, rồi chạy kiểm tra đầy đủ.
2. Trong một giao dịch: đặt `SUBMITTED`, `submitted_at`, tăng `version`, `submission_email_status = PENDING`, ghi lịch sử trạng thái.
3. Sau khi commit: sinh phiếu Word từ mẫu và gửi email tới địa chỉ sinh viên đã khai. Kết quả: `SENT` (nhà cung cấp SMTP chấp nhận) hoặc `FAILED`. Thất bại **không** hủy việc nộp. **\[ĐÃ CÓ\]**
4. Nộp lại sau chỉnh sửa cũng gửi lại email kèm phiếu đã sửa. **\[ĐÃ CÓ\]**

**\[THIẾU\]** Không có cơ chế gửi lại tự động hoặc nút gửi lại cho trạng thái `PENDING`/`FAILED` (SUBMISSION.md nhắc tới "outbox/worker" trong tương lai). **\[CHƯA RÕ\]** Nhân viên có cần xem và gửi lại email thất bại không?

## 8. Thanh toán

### 8.1 Phần đã có **\[ĐÃ CÓ\]**

- Chỉ **MANAGER (trong phạm vi) và ADMIN** xác nhận hoặc hủy xác nhận. SALE chỉ xem.
- Điều kiện: hồ sơ phải ở trạng thái **VALID**.
- `PENDING → CONFIRMED`: số tiền do **server** lấy từ cài đặt `payment.application_fee`, client không gửi số tiền. Có ghi chú tùy chọn.
- `CONFIRMED → CANCELLED`: bắt buộc lý do (1–2000 ký tự). `CANCELLED` là điểm cuối, không xác nhận lại được.
- Trạng thái thanh toán và nhật ký kiểm toán cùng một giao dịch.
- **Việc xác nhận thanh toán không đổi trạng thái hồ sơ.**

### 8.2 Vấn đề cần chốt

- **\[THIẾU – NGHIÊM TRỌNG\]** Không có code nào **tạo** dòng `payment_confirmations` (chỉ test fixture tạo). Nếu hệ thống thật không tạo dòng này thì mọi xác nhận thanh toán sẽ trả "không tìm thấy". Cần quyết định: tạo khi nộp, khi hợp lệ, hay do nhân viên tạo thủ công?
- **\[MÂU THUẪN\]** Tài liệu phân quyền ghi số tiền phải bằng `registration_links.tuition_amount`, còn code dùng `system_settingspayment.application_fee`. Hai nguồn giá trị khác nhau. Cần chọn một: phí hồ sơ chung hay học phí theo liên kết.
- **\[CHƯA RÕ\]** Nội dung chuyển khoản (`transfer_content`) do ai sinh, theo mẫu nào (cài đặt `payment.transfer_content` có nhưng không cho sửa).
- **\[CHƯA RÕ\]** Tài khoản ngân hàng nhận tiền hiển thị cho sinh viên lấy từ đâu (tài khoản mặc định `bank_accounts.is_default`?). Sinh viên có thấy hướng dẫn thanh toán trên trang đăng ký (`payment.instructions`) không.
- **\[CHƯA RÕ\]** Có yêu cầu sinh viên tải biên lai (`requireReceiptUpload` xuất hiện trong tài liệu nhưng không có chức năng tải lên).
- **\[CHƯA RÕ\]** `payment_round` (D1…) dùng để làm gì (chia đợt thanh toán?).

## 9. Xuất Word

- Nhân viên có quyền xem hồ sơ trong phạm vi được tải phiếu `.docx` khi hồ sơ ở trạng thái: SUBMITTED, WAITING_PAYMENT, PAYMENT_CONFIRMED, NEEDS_REVISION, VALID, PRINTED, COMPLETED. **\[ĐÃ CÓ\]**
- Sinh viên nhận phiếu qua **email**. Việc tải công khai bằng mã đã bị gỡ trong commit gần đây. **\[ĐÃ CÓ\]**
- **\[CHƯA RÕ\]** Bảng `application_export_credentials` (mã tải, khóa sau sai nhiều lần) còn tồn tại trong schema nhưng không còn đường dùng. Giữ hay xóa (cần review tác động theo AGENTS.md, không tự xóa bảng).

## 10. Các trạng thái và trường "mồ côi" cần quyết định

| Mục | Hiện trạng | Câu hỏi |
| --- | --- | --- |
| `WAITING_PAYMENT`, `PAYMENT_CONFIRMED` | Không có đường đi tới | Hồ sơ có đi qua các trạng thái này không, hay thanh toán tách riêng? |
| `PRINTED`, `COMPLETED` | Không có đường đi tới | Có bước "đã in" và "hoàn tất" không? Ai thực hiện? |
| `CANCELLED` (hồ sơ) | Không có đường đi tới | Ai được hủy hồ sơ, khi nào? |
| Liên kết `SUBMITTED` / `EXPIRED` | Không có đường đi tới | Tự động hóa hay bỏ? |
| `application_code` | Không sinh | Quy tắc sinh mã |
| `reviewed_by/at` | Có ghi khi duyệt | Đủ không? |
| `access_count` | Không cập nhật | Có cần đếm lượt mở không |

## 11. Tài khoản nhân viên **\[ĐÃ CÓ\]**

- Đăng nhập bằng `username` (không dùng email). Phiên 8 giờ, lưu cookie `sls_admin_session`.
- Sai mật khẩu quá `ADMIN_LOGIN_MAX_ATTEMPTS` (mặc định 5) thì khóa `ADMIN_LOGIN_LOCK_SECONDS` (mặc định 900 giây).
- ADMIN: tạo, sửa, đổi vai trò, gán quản lý, vô hiệu/kích hoạt, mở khóa, đặt lại mật khẩu, thu hồi phiên. MANAGER: xem SALE mình quản lý. Mọi người: tự đổi mật khẩu và sửa hồ sơ cá nhân.
- **\[CHƯA RÕ\]** Quy trình cấp tài khoản ban đầu và chính sách mật khẩu (độ dài, hết hạn) trong thực tế.

## 12. Danh mục và cài đặt

- **Ngành học** (`majors`): thêm, sửa, bật/tắt, thứ tự hiển thị. Chỉ ngành đang bật được chọn. **\[ĐÃ CÓ\]**
- **Kỳ tuyển sinh** (`admission_periods`): thêm, sửa, bật/tắt, ngày bắt đầu/kết thúc. Kích hoạt liên kết cần kỳ đang hoạt động. **\[ĐÃ CÓ\]**
- **Tài khoản ngân hàng**: thêm, sửa, bật/tắt, đặt/bỏ mặc định (tối đa 1 mặc định). **\[ĐÃ CÓ\]**
- **Cài đặt hệ thống** (chỉ ADMIN): `payment.instructions` (nội dung hướng dẫn), `payment.application_fee` (phí). Hai khóa nội bộ khác không cho sửa. **\[ĐÃ CÓ\]**
- **Nhật ký** (`/quan-tri/nhat-ky`): xem lịch sử hành động. **\[ĐÃ CÓ\]**

## 13. Giao diện (đường dẫn)

| Khu vực | Đường dẫn | Ai |
| --- | --- | --- |
| Đăng ký của sinh viên | `/dang-ky/{token}`, `/dang-ky/{token}/ho-so/{applicationId}` | Sinh viên |
| Đăng nhập | `/dang-nhap` | Nhân viên |
| Tổng quan | `/quan-tri` | Nhân viên |
| Liên kết | `/quan-tri/lien-ket`, `/tao-moi`, `/{id}` | SALE, MANAGER, ADMIN |
| Hồ sơ | `/quan-tri/ho-so`, `/{id}` | SALE, MANAGER, ADMIN |
| Thanh toán | `/quan-tri/thanh-toan`, `/{id}` | SALE, MANAGER, ADMIN |
| Nhân sự | `/quan-tri/nhan-su`, `/{id}` | MANAGER (xem), ADMIN |
| Ngành, kỳ, ngân hàng, cài đặt, nhật ký | `/quan-tri/nganh-hoc`, `/ky-tuyen-sinh`, `/tai-khoan-ngan-hang`, `/cai-dat`, `/nhat-ky` | Chủ yếu ADMIN |
| Tài khoản cá nhân | `/quan-tri/tai-khoan` | Mọi nhân viên |

## 14. Dịch vụ ngoài và yêu cầu phi chức năng

- **VietMap**: gợi ý địa chỉ khi điền hồ sơ (`VIETMAP_API_KEY`). Danh mục tỉnh/phường có endpoint riêng.
- **SMTP**: gửi email xác nhận kèm phiếu Word.
- **Redis REST** (staging/production): giới hạn tần suất. Dev local tắt.
- **Bảo mật**: dữ liệu cá nhân không ghi log, kiểm tra quyền ở server, token công khai một mình không đủ để cấp quyền, mã hóa/ẩn số tài khoản khi hiển thị.
- **Tải dự kiến**: khoảng 100 sinh viên/ngày.

## 15. Danh sách quyết định cần bạn chốt (ưu tiên từ trên xuống)

 1. **Tạo dòng thanh toán ở đâu?** Hiện không có code tạo. Đây là điểm chặn của luồng thanh toán (mục 8.2).
 2. **Số tiền lấy từ đâu?** Học phí theo liên kết hay phí hồ sơ chung (mục 8.2).
 3. **Sau VALID và thanh toán thì hồ sơ đi tiếp thế nào?** Có dùng `WAITING_PAYMENT`, `PAYMENT_CONFIRMED`, `PRINTED`, `COMPLETED` không (mục 10).
 4. **Hồ sơ có thể bị hủy không** và ai hủy (`CANCELLED`).
 5. **Quy tắc mã hồ sơ** (`application_code`).
 6. **Trạng thái liên kết sau khi nộp**: giữ ACTIVE hay chuyển SUBMITTED, có khóa lại không.
 7. **Người thân**: bắt buộc tối thiểu bao nhiêu người.
 8. **Cờ cam đoan và đồng ý xử lý dữ liệu** có bắt buộc `true` khi nộp không.
 9. **Email thất bại**: có gửi lại thủ công/tự động không.
10. **Liên kết hết hạn**: có tiến trình tự đánh dấu `EXPIRED` không.
11. **Biên lai thanh toán**: sinh viên có tải lên không.
12. **Bảng** `application_export_credentials`: giữ hay bỏ.
13. **Vai trò**: có cần thêm vai trò (ví dụ kế toán) để xác nhận thanh toán thay cho MANAGER không (hiện chỉ có 3 vai trò, AGENTS.md yêu cầu không tự thêm).

## 16. Giới hạn của bản suy luận này

- Chưa đọc hết lớp giao diện (React) và các schema nhập liệu chi tiết, nên danh sách trường bắt buộc phía giao diện có thể khác mục 6.3.
- Chưa chạy ứng dụng hay test để xác nhận hành vi. Các mục "ĐÃ CÓ" dựa trên đọc code, chưa kiểm chứng bằng chạy.
- Chưa đọc `Design.md`, `docs/ux/*` và các test E2E (`tests/e2e/*`), nơi có thể chứa thêm quy tắc về luồng.