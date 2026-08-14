import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import type { Capacity, ChipItem, IndexedChip, TableName } from "../types";
import { excelFileName, exportToExcel, importFromExcel, type ImportResult } from "../lib/excel";

const CAPACITIES: Capacity[] = ["", "16GB", "32GB", "64GB", "128GB", "256GB", "512GB"];

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Khung hộp thoại dùng chung: bấm nền hoặc Esc để đóng. */
export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface ItemFormProps {
  /** Có mã nghĩa là đang sửa, không có nghĩa là thêm mới. */
  chip: IndexedChip | null;
  defaultTable: TableName;
  groupOptions: string[];
  onSave: (item: Omit<ChipItem, "id">) => void;
  onClose: () => void;
}

export function ItemFormModal({ chip, defaultTable, groupOptions, onSave, onClose }: ItemFormProps) {
  const [code, setCode] = useState(chip?.code ?? "");
  const [table, setTable] = useState<TableName>(chip?.table ?? defaultTable);
  const [group, setGroup] = useState(chip?.group ?? "");
  const [cap, setCap] = useState<Capacity>(chip?.cap ?? "");
  const [note, setNote] = useState(chip?.note ?? "");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmedCode = code.trim();
    const trimmedGroup = group.trim();
    if (!trimmedCode || !trimmedGroup) {
      setError("Cần nhập cả mã ổ cứng và nhóm.");
      return;
    }
    onSave({ code: trimmedCode, table, group: trimmedGroup, cap, note: note.trim() });
  }

  return (
    <Modal title={chip ? "Sửa mã" : "Thêm mã mới"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="f-code">Mã ổ cứng</label>
          <input
            id="f-code"
            value={code}
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="VD: KLMAG4FE4B-B002"
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="f-table">Bảng</label>
          <select id="f-table" value={table} onChange={(e) => setTable(e.target.value as TableName)}>
            <option value="eMMC">eMMC</option>
            <option value="eMCP">eMCP</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="f-group">Nhóm / cột</label>
          <input
            id="f-group"
            list="group-options"
            value={group}
            placeholder="VD: EMMC 3 hoặc A5+"
            onChange={(e) => setGroup(e.target.value)}
          />
          <datalist id="group-options">
            {groupOptions.map((name) => (
              <option value={name} key={name} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="f-cap">Dung lượng (để trống nếu không có)</label>
          <select id="f-cap" value={cap} onChange={(e) => setCap(e.target.value as Capacity)}>
            {CAPACITIES.map((value) => (
              <option value={value} key={value || "none"}>
                {value || "— không ghi —"}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="f-note">Ghi chú riêng</label>
          <input
            id="f-note"
            value={note}
            placeholder="VD: hay chết, còn 2 con"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error ? <div className="msg err">{error}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn primary" type="submit">
            {chip ? "Lưu" : "Thêm vào kho"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ExportModalProps {
  items: ChipItem[];
  onClose: () => void;
}

export function ExportModal({ items, onClose }: ExportModalProps) {
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setStatus(null);
    try {
      await exportToExcel(items);
      setStatus({ text: `Đã tải file ${excelFileName()} về máy.`, ok: true });
    } catch (err) {
      setStatus({
        text: `Không tạo được file: ${err instanceof Error ? err.message : "lỗi không rõ"}`,
        ok: false,
      });
    }
    setBusy(false);
  }

  return (
    <Modal title="Xuất ra Excel" onClose={onClose}>
      <div className="msg">
        Tải toàn bộ <b>{items.length} mã</b> ra file Excel, mở bằng Excel hoặc Google Sheets đều
        được. File gồm 5 cột: Mã ổ cứng, Bảng, Nhóm / cột, Dung lượng, Ghi chú.
      </div>
      <div className="msg">
        File này <b>không mã hoá</b> — ai mở cũng đọc được. Cất chỗ kín.
      </div>
      {status ? <div className={status.ok ? "msg ok" : "msg err"}>{status.text}</div> : null}
      <div className="actions">
        <button className="btn ghost" type="button" onClick={onClose}>
          Đóng
        </button>
        <button className="btn primary" type="button" onClick={download} disabled={busy}>
          {busy ? "Đang tạo file…" : "Tải file Excel"}
        </button>
      </div>
    </Modal>
  );
}

interface ImportModalProps {
  onImport: (items: ChipItem[]) => void;
  onClose: () => void;
}

export function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setPreview(null);
    setFileName(file.name);
    try {
      setPreview(await importFromExcel(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đọc được file.");
    }
    setBusy(false);
  }

  return (
    <Modal title="Nhập từ Excel" onClose={onClose}>
      <div className="msg">
        Chọn file Excel đã xuất trước đó (hoặc file anh tự làm, miễn là hàng đầu tiên có cột{" "}
        <b>Mã ổ cứng</b>). Toàn bộ kho hiện tại sẽ được thay thế.
      </div>

      <div className="field">
        <label htmlFor="i-file">File Excel (.xlsx)</label>
        <input id="i-file" type="file" accept=".xlsx" onChange={pick} />
      </div>

      {busy ? <div className="msg">Đang đọc {fileName}…</div> : null}
      {preview ? (
        <div className="msg ok">
          Đọc được <b>{preview.items.length} mã</b> từ {fileName}
          {preview.skipped > 0 ? ` (bỏ qua ${preview.skipped} dòng trống).` : "."}
        </div>
      ) : null}
      {error ? <div className="msg err">{error}</div> : null}

      <div className="actions">
        <button className="btn ghost" type="button" onClick={onClose}>
          Huỷ
        </button>
        <button
          className="btn primary"
          type="button"
          disabled={!preview || busy}
          onClick={() => preview && onImport(preview.items)}
        >
          Thay kho bằng {preview ? `${preview.items.length} mã này` : "file này"}
        </button>
      </div>
    </Modal>
  );
}

interface PasswordModalProps {
  onChange: (current: string, next: string) => Promise<boolean>;
  onClose: () => void;
}

export function PasswordModal({ onChange, onClose }: PasswordModalProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next.length < 6) {
      setError("Mật khẩu mới cần ít nhất 6 ký tự.");
      return;
    }
    setError("");
    setBusy(true);
    const ok = await onChange(current, next);
    if (!ok) {
      setBusy(false);
      setError("Mật khẩu hiện tại không đúng.");
    }
  }

  return (
    <Modal title="Đổi mật khẩu" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="msg">Nhập mật khẩu hiện tại để xác nhận, rồi đặt mật khẩu mới.</div>
        <div className="field">
          <label htmlFor="c-old">Mật khẩu hiện tại</label>
          <input
            id="c-old"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="c-own">Mật khẩu mới</label>
          <input
            id="c-own"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        {error ? <div className="msg err">{error}</div> : null}
        <div className="actions">
          <button className="btn ghost" type="button" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Đang đổi…" : "Đổi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
