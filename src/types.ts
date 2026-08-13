/** Bảng tra: eMMC (chia theo dung lượng) hoặc eMCP (chia theo nhóm chân). */
export type TableName = "eMMC" | "eMCP";

/** Dung lượng dùng cho badge màu. Chuỗi rỗng nghĩa là bảng không ghi dung lượng. */
export type Capacity = "" | "16GB" | "32GB" | "64GB" | "128GB" | "256GB" | "512GB";

/** Một mã ổ cứng trong kho. */
export interface ChipItem {
  id: string;
  code: string;
  table: TableName;
  group: string;
  cap: Capacity;
  note: string;
}

/** Mã đã dựng sẵn chỉ mục để tìm kiếm nhanh, không cần chuẩn hoá lại mỗi lần gõ. */
export interface IndexedChip extends ChipItem {
  /** Mã đã bỏ hết ký tự không phải chữ/số, viết hoa. */
  norm: string;
  /** Vị trí từng ký tự của `norm` trong `code` gốc — dùng để tô đúng chỗ. */
  map: number[];
  /** Các đoạn tách theo dấu cách, gạch nối, gạch chéo — để tìm mã nằm giữa ô gộp. */
  tokens: string[];
}

/** Vai trò mở kho. Chủ tiệm sửa được, thợ chỉ tra cứu. */
export type Role = "owner" | "staff";

/** Một khoá dữ liệu đã bọc bằng mật khẩu của một vai trò. */
export interface WrappedKey {
  salt: string;
  iv: string;
  key: string;
}

/** Gói dữ liệu đã mã hoá nằm trong localStorage. Không chứa mật khẩu dưới bất kỳ dạng nào. */
export interface Vault {
  v: 1;
  iter: number;
  owner: WrappedKey;
  staff: WrappedKey;
  data: { iv: string; ct: string };
}

/** Nhóm hiển thị trên lưới duyệt. */
export interface GroupSummary {
  table: TableName;
  name: string;
  cap: Capacity;
  note: string;
  count: number;
}
