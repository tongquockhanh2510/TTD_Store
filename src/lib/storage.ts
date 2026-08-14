import type { ChipItem, Vault } from "../types";

const VAULT_KEY = "ttd_mobile_vault_v1";
/** Kho của bản HTML một file trước đây — mang sang khi tiệm chuyển qua bản React. */
const LEGACY_KEY = "ttd_mobile_chipdb_v1";

export function readVault(): Vault | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Vault;
    if (!parsed?.owner || !parsed?.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Trả về false khi trình duyệt chặn ghi (chế độ ẩn danh, hết dung lượng). */
export function writeVault(vault: Vault): boolean {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
    return true;
  } catch {
    return false;
  }
}

export function clearVault(): void {
  try {
    localStorage.removeItem(VAULT_KEY);
  } catch {
    // Không xoá được thì cũng không làm gì thêm được.
  }
}

/** Kho cũ chưa mã hoá, nếu có. Dùng làm dữ liệu ban đầu khi đặt mật khẩu lần đầu. */
export function readLegacyItems(): ChipItem[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChipItem[];
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.code) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function clearLegacyItems(): void {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Bỏ qua.
  }
}
