# Nghiên cứu UI/UX cho biểu mẫu đăng ký sinh viên

Ngày nghiên cứu: 2026-09-10

## Mục tiêu

Cải thiện khả năng hiểu và tốc độ nhập liệu của biểu mẫu công khai, đồng thời giữ biểu mẫu dễ sử dụng trên điện thoại, máy tính bảng, desktop và khi phóng to trình duyệt. Tài liệu này chỉ đưa ra khuyến nghị và kế hoạch; chưa thay đổi mã ứng dụng.

## Kết luận chính

### 1. Placeholder chỉ là ví dụ, không thay thế label hoặc hint

- Mọi trường phải tiếp tục có label hiển thị, ngắn và rõ. WCAG 3.3.2 yêu cầu label hoặc hướng dẫn khi nội dung cần người dùng nhập; thông tin về định dạng cũng nên được trình bày khi cần ([W3C — Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)).
- Placeholder biến mất sau khi nhập và không nên được dùng thay label. MDN khuyến nghị placeholder chỉ là một từ/cụm ngắn gợi ý kiểu dữ liệu mong đợi ([MDN — placeholder](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/placeholder)). GOV.UK và USWDS còn khuyến nghị tránh dùng placeholder cho hint/ví dụ quan trọng vì người dùng không thể xem lại sau khi gõ và độ tương phản mặc định có thể không đạt ([GOV.UK — Text input](https://design-system.service.gov.uk/components/text-input/), [USWDS — Text input](https://designsystem.digital.gov/components/text-input/)).
- Vì yêu cầu sản phẩm muốn có placeholder, cách dung hòa an toàn là: giữ label; dùng placeholder ngắn cho ví dụ không thiết yếu; dùng hint hiển thị cố định và nối bằng `aria-describedby` nếu có quy tắc/định dạng bắt buộc.
- Placeholder đề xuất phải là tiếng Việt, sát dữ liệu thực tế và không ngụ ý một quy tắc nghiệp vụ chưa được xác nhận. Ví dụ: `Nguyễn Văn An`, `0912 345 678`, `nguyenvanan@example.com`, `Số nhà, tên đường...`, `Tên trường THPT...`. Không đưa dữ liệu sinh viên thật vào ví dụ.

### 2. Giảm thao tác nhập bằng semantics của HTML

- Dùng đúng `type` và `autocomplete` cho dữ liệu cá nhân: `name`, `bday`, `tel`, `email`, `street-address` hoặc các token địa chỉ phù hợp. WCAG 1.3.5 nêu rằng mục đích của trường thu thập dữ liệu cá nhân cần được xác định bằng máy; autocomplete giúp giảm gõ và giảm phụ thuộc vào trí nhớ ([W3C — Identify Input Purpose](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html), [W3C — Technique H98](https://www.w3.org/WAI/WCAG22/Techniques/html/H98.html)).
- `inputmode` chỉ gợi ý bàn phím ảo phù hợp; nó không tự kiểm tra dữ liệu. Dùng `tel` cho điện thoại, `email` cho email, `numeric`/`decimal` chỉ cho trường thực sự tương ứng ([MDN — inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode)).
- Không chia số điện thoại hoặc chuỗi số thành nhiều ô nếu không có yêu cầu nghiệp vụ; USWDS khuyến nghị một ô duy nhất vì nhiều ô làm nhãn cho trình đọc màn hình khó hiểu hơn ([USWDS — Text input](https://designsystem.digital.gov/components/text-input/)).

### 3. Chiều rộng trường nên phản ánh độ dài dữ liệu

- GOV.UK và USWDS đều khuyến nghị kích thước ô tương xứng với độ dài dự kiến; ô ngắn giúp người dùng hiểu lượng dữ liệu cần nhập ([GOV.UK — Text input](https://design-system.service.gov.uk/components/text-input/), [USWDS — Text input](https://designsystem.digital.gov/components/text-input/)).
- Khuyến nghị cho dự án (suy luận thiết kế từ hướng dẫn trên):

  | Loại trường | Desktop/tablet | Mobile |
  |---|---|---|
  | Họ tên, địa chỉ, trường học, nơi làm việc | Toàn hàng | Toàn hàng |
  | Email, số điện thoại | Có thể ghép 2 cột nếu thứ tự đọc vẫn tự nhiên | Một cột |
  | Ngày sinh, giới tính, dân tộc, tôn giáo hoặc lựa chọn ngắn tương tự | Ghép 2–3 cột theo nhóm liên quan | Một cột mặc định; chỉ 2 cột nếu mỗi ô vẫn đủ rộng và label không xuống dòng khó đọc |
  | Tỉnh/thành, phường/xã | 2 cột khi đủ rộng | Một cột để danh sách và bàn phím không chật |
  | Ngành, nguyện vọng, nội dung có lựa chọn dài | Toàn hàng | Toàn hàng |

- Không ép “càng nhiều ô trên một hàng càng tốt”. Mật độ chỉ có lợi khi nhóm trường có quan hệ rõ, chiều dài ngắn và thứ tự đọc trái-sang-phải rồi trên-xuống không thay đổi giữa DOM và hình ảnh.

### 4. Responsive ưu tiên một cột ở chiều rộng hẹp

- WCAG Reflow yêu cầu nội dung dọc vẫn sử dụng được ở chiều rộng tương đương 320 CSS px mà không mất thông tin/chức năng hoặc phải cuộn hai chiều ([W3C — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow)).
- Khuyến nghị triển khai: mobile-first `grid-cols-1`; nâng lên `sm:grid-cols-2` hoặc `md:grid-cols-2/3` theo từng nhóm, không áp một grid chung cho toàn bộ biểu mẫu. Mỗi trường phải có `min-width: 0`; menu gợi ý địa chỉ/select không được rộng hơn viewport.
- Ở 320–390 px, giữ một cột cho phần lớn trường. Chỉ dùng hai cột cho lựa chọn rất ngắn nếu thử nghiệm thực tế chứng minh không làm label bị bó hoặc target chạm quá gần nhau.
- Điều hướng `Trang trước`/`Trang sau`/`Nộp hồ sơ` nên cùng thứ tự trực quan và DOM. Trên mobile có thể xếp dọc hoặc cho hai nút chia đều hàng; trạng thái loading không làm nút đổi kích thước gây layout shift.

### 5. Kích thước chạm, focus và lỗi

- Mức tối thiểu WCAG 2.2 cho target là 24×24 CSS px (có ngoại lệ về khoảng cách), nhưng dự án nên đặt nút, trigger select/date picker và icon tương tác ở mức khoảng 44 px để thao tác cảm ứng thoải mái hơn ([W3C — Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- Focus phải nhìn thấy rõ; biểu mẫu cần hoạt động bằng bàn phím, ở cả portrait/landscape và tại 200% zoom. USWDS cung cấp checklist kiểm tra trực tiếp cho các trường hợp này ([USWDS — Text input accessibility tests](https://designsystem.digital.gov/components/text-input/accessibility-tests/)).
- Chỉ báo lỗi không được chỉ dùng màu. Lỗi phải nêu bằng văn bản trường nào sai và cách sửa; khi chuyển trang thất bại, đưa focus tới lỗi đầu tiên hoặc error summary có liên kết đến trường ([W3C — Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)).

## Kế hoạch triển khai đề xuất

### Giai đoạn 1 — Kiểm kê và chuẩn hóa metadata của trường

1. Lập bảng toàn bộ trường theo section: label hiện tại, bắt buộc/tùy chọn, kiểu dữ liệu, độ dài dự kiến, placeholder, hint, `type`, `autocomplete`, `inputmode`, và chiều rộng responsive.
2. Chỉ dùng quy tắc validation đã tồn tại trong schema/code/tài liệu nghiệp vụ; đánh dấu các định dạng chưa có nguồn thay vì tự đặt.
3. Chuẩn hóa một API dùng chung cho field wrapper: label, required marker, hint ID, error ID, `aria-describedby` và `aria-invalid`.

### Giai đoạn 2 — Nội dung hướng dẫn nhập

1. Thêm placeholder ngắn cho các ô văn bản có ví dụ hữu ích.
2. Đưa mọi quy tắc quan trọng sang hint luôn hiển thị, ví dụ loại giấy tờ được chấp nhận hoặc định dạng điểm nếu nghiệp vụ đã xác nhận.
3. Gắn `autocomplete`, `type`, `inputmode`, `autocapitalize` và `spellCheck` phù hợp; không vô hiệu hóa copy/paste.

### Giai đoạn 3 — Layout responsive theo nhóm

1. Giữ trường dài toàn hàng; tạo grid riêng cho từng cụm trường ngắn, có liên quan.
2. Mobile dưới breakpoint phù hợp dùng một cột; desktop/tablet dùng 2–3 cột có chọn lọc.
3. Kiểm tra dropdown, date picker và danh sách gợi ý địa chỉ không tràn viewport; giữ thứ tự DOM giống thứ tự nhìn thấy.
4. Bảo đảm tất cả control tương tác có vùng chạm thoải mái và focus ring rõ.

### Giai đoạn 4 — Validation và điều hướng

1. Chỉ hiện lỗi sau khi người dùng tương tác hoặc bấm tiếp tục/nộp.
2. Lỗi gồm thông báo tiếng Việt cụ thể, `aria-invalid`, `aria-describedby`; khi chặn chuyển trang, focus/scroll tới lỗi đầu tiên.
3. Không xóa dữ liệu khi đổi breakpoint, chuyển trang, validation thất bại hoặc quay lại trang trước.

### Giai đoạn 5 — Kiểm thử và nghiệm thu

1. Chạy test hiện có, type-check và build.
2. Bổ sung test cho placeholder/hint, attributes HTML, điều hướng lỗi và việc giữ dữ liệu.
3. Manual QA tại 320×568, 375×667, 390×844, 768×1024, 1280×800 và 1440×900 như checklist UAT hiện có của repo; thử portrait/landscape, bàn phím ảo, 200% zoom và reflow 320 CSS px.
4. Kiểm tra keyboard-only, screen reader, focus order, focus ring, target size, thông báo lỗi, overflow và menu gợi ý địa chỉ.

## Tiêu chí hoàn thành

- 100% trường có label hiển thị được liên kết đúng với control.
- Placeholder chỉ chứa ví dụ ngắn; không có hướng dẫn bắt buộc chỉ tồn tại trong placeholder.
- Các trường cá nhân phù hợp có `autocomplete`; email/điện thoại có `type` và `inputmode` đúng.
- Không có cuộn ngang hoặc nội dung bị cắt tại 320 CSS px; không mất chức năng ở portrait/landscape và 200% zoom.
- Trường dài toàn hàng; trường ngắn chỉ ghép hàng khi còn dễ đọc/chạm và thứ tự đọc hợp lý.
- Lỗi được mô tả bằng chữ, được liên kết với trường và focus tới vị trí cần sửa.
- Dữ liệu đã nhập được giữ nguyên khi chuyển trang, quay lại và thay đổi kích thước viewport.

## Rủi ro cần xác nhận trước khi sửa mã

- Placeholder, hint và validation cho CCCD/CMND, mã trường, điểm số hoặc mã ngành cần dựa trên quy tắc nghiệp vụ hiện có; không suy đoán độ dài/định dạng.
- `autocomplete` cho thông tin người thân không nên dùng token của chính người điền nếu có nguy cơ trình duyệt tự điền sai người; cần kiểm thử và có thể tắt theo từng trường, không tắt toàn form một cách mặc định.
- Cần kiểm thử menu gợi ý địa chỉ với bàn phím và screen reader vì đây là custom combobox, không chỉ là text input thường.
