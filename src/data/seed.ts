import type { ChipItem } from "../types";
import { EMMC_GROUPS } from "./emmc";
import { EMCP_GROUPS } from "./emcp";

/**
 * Trải hai bảng nhóm thành một danh sách phẳng để tìm kiếm.
 * Đây là dữ liệu gốc đọc từ hai ảnh bảng tra, dùng khi tạo kho lần đầu.
 */
export function buildSeedItems(): ChipItem[] {
  const items: ChipItem[] = [];
  let counter = 0;

  for (const group of EMMC_GROUPS) {
    for (const code of group.codes) {
      items.push({
        id: `s${counter++}`,
        code,
        table: "eMMC",
        group: group.name,
        cap: group.cap,
        note: group.note ?? "",
      });
    }
  }

  for (const group of EMCP_GROUPS) {
    for (const code of group.codes) {
      items.push({
        id: `s${counter++}`,
        code,
        table: "eMCP",
        group: group.name,
        cap: "",
        note: "",
      });
    }
  }

  return items;
}

/** Sinh id cho mã do tiệm tự thêm, không đụng với id của dữ liệu gốc. */
export function newItemId(): string {
  return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
