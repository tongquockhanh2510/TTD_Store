import type { ChipItem, Vault, WrappedKey } from "../types";

/**
 * Kho được khoá theo kiểu bọc khoá (key wrapping):
 *
 *   1. Sinh một khoá dữ liệu ngẫu nhiên (DEK) để mã hoá danh sách mã.
 *   2. Bọc DEK bằng mật khẩu.
 *   3. Mở kho = tháo gói bằng mật khẩu vừa nhập.
 *
 * Mật khẩu không được lưu ở bất kỳ đâu, kể cả dạng băm. Quên là mất kho.
 */

export const PBKDF2_ITERATIONS = 200_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Web Crypto chỉ có trên https và localhost. Kiểm tra sớm để báo cho người dùng biết. */
export function cryptoAvailable(): boolean {
  return typeof globalThis.crypto !== "undefined" && !!globalThis.crypto.subtle;
}

function subtle(): SubtleCrypto {
  if (!cryptoAvailable()) {
    throw new Error("Trình duyệt không hỗ trợ Web Crypto (cần kết nối https).");
  }
  return globalThis.crypto.subtle;
}

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Kéo dài mật khẩu thành khoá AES bằng PBKDF2 — chậm có chủ đích, để dò mật khẩu tốn kém. */
async function deriveKek(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return subtle().deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function wrapKey(password: string, rawKey: ArrayBuffer): Promise<WrappedKey> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const kek = await deriveKek(password, salt, PBKDF2_ITERATIONS);
  const wrapped = await subtle().encrypt({ name: "AES-GCM", iv }, kek, rawKey);
  return { salt: toBase64(salt), iv: toBase64(iv), key: toBase64(wrapped) };
}

/** Ném lỗi nếu mật khẩu sai — AES-GCM tự phát hiện, không cần so sánh thủ công. */
async function unwrapKey(password: string, pack: WrappedKey, iterations: number): Promise<CryptoKey> {
  const kek = await deriveKek(password, fromBase64(pack.salt), iterations);
  const raw = await subtle().decrypt(
    { name: "AES-GCM", iv: fromBase64(pack.iv) as BufferSource },
    kek,
    fromBase64(pack.key) as BufferSource,
  );
  return subtle().importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

export async function encryptItems(
  key: CryptoKey,
  items: ChipItem[],
): Promise<{ iv: string; ct: string }> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plain = encoder.encode(JSON.stringify(items));
  const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, plain);
  return { iv: toBase64(iv), ct: toBase64(ct) };
}

export async function decryptItems(
  key: CryptoKey,
  pack: { iv: string; ct: string },
): Promise<ChipItem[]> {
  const buffer = await subtle().decrypt(
    { name: "AES-GCM", iv: fromBase64(pack.iv) as BufferSource },
    key,
    fromBase64(pack.ct) as BufferSource,
  );
  return JSON.parse(decoder.decode(buffer)) as ChipItem[];
}

/** Tạo kho mới từ một mật khẩu. Trả về cả gói đã mã hoá lẫn khoá đang mở, để vào app luôn. */
export async function createVault(
  password: string,
  items: ChipItem[],
): Promise<{ vault: Vault; key: CryptoKey }> {
  const key = await subtle().generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const raw = await subtle().exportKey("raw", key);
  const owner = await wrapKey(password, raw);
  const data = await encryptItems(key, items);
  return { vault: { v: 1, iter: PBKDF2_ITERATIONS, owner, data }, key };
}

/** Thử tháo gói bằng mật khẩu. Trả về null nếu sai mật khẩu. */
export async function openVault(password: string, vault: Vault): Promise<CryptoKey | null> {
  const iterations = vault.iter || PBKDF2_ITERATIONS;
  try {
    return await unwrapKey(password, vault.owner, iterations);
  } catch {
    return null;
  }
}

/** Khoá lại kho bằng mật khẩu mới. Khoá dữ liệu giữ nguyên nên không phải mã hoá lại kho. */
export async function rekeyVault(
  vault: Vault,
  key: CryptoKey,
  currentPassword: string,
  nextPassword: string,
): Promise<Vault> {
  await unwrapKey(currentPassword, vault.owner, vault.iter || PBKDF2_ITERATIONS);
  const raw = await subtle().exportKey("raw", key);
  const owner = await wrapKey(nextPassword, raw);
  return { ...vault, iter: PBKDF2_ITERATIONS, owner };
}
