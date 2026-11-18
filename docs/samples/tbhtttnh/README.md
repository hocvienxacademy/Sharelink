# Mẫu Thông báo hoàn thiện thủ tục nhập học (TBHTTTNH)

Thư mục này chứa **tài liệu tham chiếu** để dựng mẫu PDF TBHTTTNH khớp chính xác bản gốc.
Các file ở đây chỉ dùng để đọc bố cục và vị trí; ảnh dùng khi chạy thật (logo, dấu, chữ ký)
sẽ được tải lên và lưu trong hệ thống qua màn hình quản lý mẫu.

## Các file cần đặt vào thư mục này

| Tên file đề xuất | Nội dung | Ghi chú |
| --- | --- | --- |
| `mau-cuoi-cung.pdf` | File PDF hoàn chỉnh gửi cho học viên (ví dụ bản của Nguyễn Lê Nhã Ca) | **Bản chuẩn** về bố cục, nội dung, vị trí dấu và chữ ký |
| `mau-nhap-tbhtttnh.xlsx` | File Excel mẫu để nhập danh sách (đã tạo sẵn) | 14 cột; sheet "Hướng dẫn" mô tả từng cột |
| `mau-goc.docx` | **File Word gốc** dùng để xuất ra PDF | Quan trọng nhất: cho biết chính xác font, cỡ chữ, lề, tab |
| `ban-danh-dau.jpg` | Ảnh chụp bản in có tô hồng các vị trí dữ liệu thay đổi | Đã nhận qua chat |
| `logo-tvu.png` | Logo TVU, dùng làm watermark nền mờ | PNG nền trong suốt, độ phân giải cao |
| `moc-do.svg` | Mộc đỏ "TRUNG TÂM ĐÀO TẠO TRỰC TUYẾN TỪ XA" | Xem lưu ý về font bên dưới |
| `chu-ky-nhay.png` | Chữ ký nháy | PNG nền trong suốt |

## Lưu ý

- Thư mục này đã được cấu hình trong `.gitignore`: **chỉ** `README.md`, `mau-nhap-tbhtttnh.xlsx`
  và `logo-tvu.png` được commit. Chữ ký, mộc đỏ và các file chứa dữ liệu học viên thật chỉ nằm
  trên máy, không đưa lên git.
- `moc-do.svg` hiện dùng chữ dạng `<text>` với font **Roboto Condensed**. Khi đưa vào PDF,
  chữ trong SVG có thể hiển thị sai nếu máy không có font này. Nên xuất lại SVG với chữ đã
  **chuyển thành đường nét (Convert to curves / Outline)**, hoặc xuất PNG độ phân giải cao
  (tối thiểu 1500 px chiều ngang).
