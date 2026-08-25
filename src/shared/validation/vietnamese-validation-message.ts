const ENGLISH_VALIDATION_MESSAGE =
  /^(?:Invalid\b|Expected\b|Too (?:small|big)\b|Unrecognized key\b|Relative positions\b|Required\b)/u;

export function toVietnameseValidationMessage(
  message: string,
  code?: string,
): string {
  if (!ENGLISH_VALIDATION_MESSAGE.test(message)) {
    return message;
  }

  switch (code) {
    case "invalid_type":
      return "Kiểu dữ liệu không hợp lệ.";
    case "invalid_format":
      return "Định dạng dữ liệu không hợp lệ.";
    case "too_small":
      return "Giá trị nhỏ hơn giới hạn cho phép.";
    case "too_big":
      return "Giá trị vượt quá giới hạn cho phép.";
    case "invalid_value":
      return "Giá trị không thuộc danh sách cho phép.";
    case "unrecognized_keys":
      return "Dữ liệu chứa trường không được hỗ trợ.";
    default:
      return "Giá trị không hợp lệ.";
  }
}
