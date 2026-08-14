import type { ReactNode } from "react";
import type { IndexedChip, GroupSummary } from "../types";
import type { SearchHit } from "../lib/search";
import { highlightParts } from "../lib/search";

interface ChipRowProps {
  chip: IndexedChip;
  query: string;
  /** Viền cam đánh dấu khớp từ đầu mã, chỉ bật khi kết quả có lẫn loại khớp yếu hơn. */
  strong: boolean;
  /** Tắt khi thẻ đã nằm dưới tiêu đề cột — khỏi lặp lại tên cột hai lần. */
  showGroup?: boolean;
  canEdit: boolean;
  onEdit: (chip: IndexedChip) => void;
  onDelete: (chip: IndexedChip) => void;
}

export function ChipRow({ chip, query, strong, showGroup = true, canEdit, onEdit, onDelete }: ChipRowProps) {
  const parts = highlightParts(chip, query);

  return (
    <article className={strong ? "item hit" : "item"}>
      <div className="item-body">
        <div className="code">
          {parts.map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}
        </div>
        <div className="tags">
          {showGroup ? (
            <span className="tag">
              {chip.table} · {chip.group}
            </span>
          ) : null}
          {chip.cap ? (
            <span className="tag cap" data-cap={chip.cap}>
              {chip.cap}
            </span>
          ) : null}
          {chip.note ? <span className="tag note">{chip.note}</span> : null}
        </div>
      </div>

      {canEdit ? (
        <div className="row-btns">
          <button className="row-btn" type="button" title="Sửa" aria-label={`Sửa ${chip.code}`} onClick={() => onEdit(chip)}>
            ✎
          </button>
          <button
            className="row-btn del"
            type="button"
            title="Xoá"
            aria-label={`Xoá ${chip.code}`}
            onClick={() => onDelete(chip)}
          >
            🗑
          </button>
        </div>
      ) : null}
    </article>
  );
}

export interface ResultBucket {
  table: string;
  name: string;
  cap: string;
  hits: SearchHit[];
}

interface ResultColumnsProps {
  buckets: ResultBucket[];
  query: string;
  mixedScores: boolean;
  canEdit: boolean;
  onEdit: (chip: IndexedChip) => void;
  onDelete: (chip: IndexedChip) => void;
}

/**
 * Mỗi nhóm khớp (vd. eMCP · A1) là một cột riêng nằm cạnh nhau, tiêu đề cột cố định ở
 * trên — giống hệt cách thợ đọc bảng tra gốc, thay vì phải cuộn qua từng khối xếp chồng.
 */
export function ResultColumns({ buckets, query, mixedScores, canEdit, onEdit, onDelete }: ResultColumnsProps) {
  return (
    <div className="result-columns">
      {buckets.map((bucket) => (
        <div className="result-column" key={`${bucket.table}-${bucket.name}`}>
          <div className="column-head">
            <h3>
              {bucket.table} · {bucket.name}
              {bucket.cap ? ` · ${bucket.cap}` : ""}
            </h3>
            <em>{bucket.hits.length}</em>
          </div>
          <div className="column-body">
            {bucket.hits.map(({ chip, score }) => (
              <ChipRow
                key={chip.id}
                chip={chip}
                query={query}
                strong={mixedScores && score === 0}
                showGroup={false}
                canEdit={canEdit}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface GroupGridProps {
  groups: GroupSummary[];
  onOpen: (name: string) => void;
}

/** Lưới nhóm hiện khi ô tìm kiếm còn trống — để duyệt thay vì phải nhớ mã. */
export function GroupGrid({ groups, onOpen }: GroupGridProps) {
  return (
    <div className="group-grid">
      {groups.map((group) => (
        <button className="group-card" type="button" key={`${group.table}-${group.name}`} onClick={() => onOpen(group.name)}>
          <span className="group-name">{group.name}</span>
          <span className="group-meta">
            {group.cap ? (
              <span className="tag cap" data-cap={group.cap}>
                {group.cap}
              </span>
            ) : null}
            <span className="group-count">{group.count} mã</span>
          </span>
          {group.note ? <span className="group-note">{group.note}</span> : null}
        </button>
      ))}
    </div>
  );
}

interface SectionProps {
  title: string;
  count: number;
  children: ReactNode;
}

export function Section({ title, count, children }: SectionProps) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <em>{count} mã</em>
      </div>
      {children}
    </section>
  );
}
