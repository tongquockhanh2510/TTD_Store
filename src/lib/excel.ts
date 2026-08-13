import type { Capacity, ChipItem, TableName } from "../types";
// Import chỉ lấy kiểu dữ liệu, không kéo theo mã của thư viện — thư viện thật
// chỉ tải khi chủ tiệm bấm Xuất/Nhập (xem dynamic import bên dưới).
import type { Row } from "write-excel-file/browser";
import type { Row as ExcelRow } from "read-excel-file/browser";

/**
 * Xuất và nhập kho bằng file Excel.
 *
 * Hai thư viện Excel chỉ được tải khi chủ tiệm thực sự bấm Xuất hoặc Nhập
 * (dynamic import), nên người chỉ tra cứu không phải tải thêm gì.
 */

const HEADERS = ["Mã ổ cứng", "Bảng", "Nhóm / cột", "Dung lượng", "Ghi chú"] as const;

/** Tên cột chấp nhận được khi đọc file, để anh đổi tiêu đề trong Excel vẫn nhập lại được. */
const COLUMN_ALIASES: Record<string, keyof ChipItem> = {
  "mã ổ cứng": "code",
  "ma o cung": "code",
  mã: "code",
  ma: "code",
  code: "code",
  bảng: "table",
  bang: "table",
  table: "table",
  "nhóm / cột": "group",
  "nhóm/cột": "group",
  nhóm: "group",
  nhom: "group",
  cột: "group",
  cot: "group",
  group: "group",
  "dung lượng": "cap",
  "dung luong": "cap",
  cap: "cap",
  capacity: "cap",
  "ghi chú": "note",
  "ghi chu": "note",
  note: "note",
};

const VALID_CAPS = new Set<Capacity>(["", "16GB", "32GB", "64GB", "128GB", "256GB", "512GB"]);

export function excelFileName(): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  return `kho-chip-ttd-store-${stamp}.xlsx`;
}

export async function exportToExcel(items: ChipItem[]): Promise<void> {
  // Gói này không có export gốc — "/browser" là bản chạy trong trình duyệt.
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const headerRow: Row = HEADERS.map((title) => ({
    value: title,
    fontWeight: "bold",
    backgroundColor: "#FFF1E3",
  }));
  const dataRows: Row[] = items.map((item) => [
    { value: item.code, type: String },
    { value: item.table, type: String },
    { value: item.group, type: String },
    { value: item.cap, type: String },
    { value: item.note, type: String },
  ]);

  const file = await writeXlsxFile([headerRow, ...dataRows], {
    sheet: "Kho chip",
    columns: [{ width: 26 }, { width: 10 }, { width: 14 }, { width: 13 }, { width: 32 }],
  });
  await file.toFile(excelFileName());
}

/** Chuẩn hoá tiêu đề cột để so khớp: bỏ khoảng trắng thừa, viết thường. */
function headerKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export interface ImportResult {
  items: ChipItem[];
  /** Số dòng bị bỏ vì không có mã. */
  skipped: number;
}

export async function importFromExcel(file: File): Promise<ImportResult> {
  // readSheet đọc thẳng sheet đầu tiên thành mảng dòng, đỡ phải đào vào Sheet[].
  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file);

  if (rows.length < 2) {
    throw new Error("File không có dòng dữ liệu nào bên dưới hàng tiêu đề.");
  }

  // Dò vị trí từng cột theo tiêu đề, để đổi thứ tự cột trong Excel vẫn nhập được.
  const positions = new Map<keyof ChipItem, number>();
  rows[0].forEach((cell, index) => {
    const field = COLUMN_ALIASES[headerKey(cell)];
    if (field && !positions.has(field)) positions.set(field, index);
  });

  const codeAt = positions.get("code");
  if (codeAt === undefined) {
    throw new Error('Không tìm thấy cột "Mã ổ cứng" ở hàng đầu tiên.');
  }

  const read = (row: ExcelRow, field: keyof ChipItem): string => {
    const at = positions.get(field);
    if (at === undefined) return "";
    return String(row[at] ?? "").trim();
  };

  const items: ChipItem[] = [];
  let skipped = 0;

  rows.slice(1).forEach((row, index) => {
    const code = String(row[codeAt] ?? "").trim();
    if (!code) {
      skipped += 1;
      return;
    }
    const cap = read(row, "cap").toUpperCase().replace(/\s+/g, "") as Capacity;
    const table: TableName = read(row, "table").toLowerCase() === "emcp" ? "eMCP" : "eMMC";
    items.push({
      id: `x${index}`,
      code,
      table,
      group: read(row, "group") || "Khác",
      cap: VALID_CAPS.has(cap) ? cap : "",
      note: read(row, "note"),
    });
  });

  if (items.length === 0) {
    throw new Error("Không đọc được mã nào — kiểm tra lại cột Mã ổ cứng trong file.");
  }

  return { items, skipped };
}
