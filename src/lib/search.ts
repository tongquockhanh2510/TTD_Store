import type { ChipItem, IndexedChip } from "../types";

/**
 * Bỏ mọi thứ không phải chữ hoặc số rồi viết hoa.
 * Nhờ vậy gõ "klmag4fe4b" hay "KLMAG4FE4B-B002" đều khớp cùng một mã.
 */
export function normalize(input: string): string {
  let out = "";
  for (const raw of input) {
    const ch = raw.toUpperCase();
    if ((ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9")) out += ch;
  }
  return out;
}

/** Vừa chuẩn hoá vừa nhớ vị trí gốc của từng ký tự, để tô sáng đúng chỗ trên mã thật. */
function normalizeWithMap(input: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const ch = input[i].toUpperCase();
    if ((ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9")) {
      norm += ch;
      map.push(i);
    }
  }
  return { norm, map };
}

/** Dựng chỉ mục cho một mã. Gọi một lần lúc nạp, không gọi lại mỗi lần gõ phím. */
export function indexChip(item: ChipItem): IndexedChip {
  const { norm, map } = normalizeWithMap(item.code);
  return {
    ...item,
    norm,
    map,
    // Ô gộp như "JZ006-JZ018-JZ050" tách ra để gõ riêng JZ018 vẫn tìm thấy.
    tokens: item.code
      .split(/[\s/,\-–—]+/)
      .map(normalize)
      .filter((t) => t.length > 0),
  };
}

export function indexAll(items: ChipItem[]): IndexedChip[] {
  return items.map(indexChip);
}

/** 0 = khớp từ đầu mã, 1 = khớp từ đầu một đoạn, 2 = khớp ở giữa, null = không khớp. */
function scoreOf(chip: IndexedChip, query: string): number | null {
  if (chip.norm.startsWith(query)) return 0;
  if (chip.tokens.some((t) => t.startsWith(query))) return 1;
  if (chip.norm.includes(query)) return 2;
  return null;
}

export interface SearchHit {
  chip: IndexedChip;
  score: number;
}

export interface SearchFilters {
  table: "all" | "eMMC" | "eMCP";
  group: string | null;
}

export function searchChips(
  chips: IndexedChip[],
  rawQuery: string,
  filters: SearchFilters,
): SearchHit[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  const hits: SearchHit[] = [];
  for (const chip of chips) {
    if (filters.table !== "all" && chip.table !== filters.table) continue;
    if (filters.group && chip.group !== filters.group) continue;
    const score = scoreOf(chip, query);
    if (score !== null) hits.push({ chip, score });
  }

  hits.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.chip.table !== b.chip.table) return a.chip.table === "eMMC" ? -1 : 1;
    return a.chip.norm < b.chip.norm ? -1 : 1;
  });
  return hits;
}

export interface HighlightPart {
  text: string;
  hit: boolean;
}

/** Cắt mã thành 3 phần quanh đoạn trùng khớp, để React tô sáng mà không cần dangerouslySetInnerHTML. */
export function highlightParts(chip: IndexedChip, rawQuery: string): HighlightPart[] {
  const query = normalize(rawQuery);
  if (!query) return [{ text: chip.code, hit: false }];

  const at = chip.norm.indexOf(query);
  if (at < 0) return [{ text: chip.code, hit: false }];

  const from = chip.map[at];
  const to = chip.map[at + query.length - 1];
  const parts: HighlightPart[] = [];
  if (from > 0) parts.push({ text: chip.code.slice(0, from), hit: false });
  parts.push({ text: chip.code.slice(from, to + 1), hit: true });
  if (to + 1 < chip.code.length) parts.push({ text: chip.code.slice(to + 1), hit: false });
  return parts;
}
