import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChipItem, GroupSummary, IndexedChip, Role, TableName, Vault } from "./types";
import { SHOP } from "./config";
import { buildSeedItems, newItemId } from "./data/seed";
import { cryptoAvailable, createVault, decryptItems, encryptItems, openVault, rekeyVault } from "./lib/crypto";
import { indexAll, indexChip, searchChips } from "./lib/search";
import { clearLegacyItems, clearVault, readLegacyItems, readVault, writeVault } from "./lib/storage";
import { LoginGate, SetupGate, UnsupportedGate } from "./components/Gate";
import { LogoMark } from "./components/Logo";
import { ChipRow, GroupGrid, Section } from "./components/ChipList";
import { ExportModal, ImportModal, ItemFormModal, PasswordModal } from "./components/Modals";

type Screen = "setup" | "login" | "app" | "unsupported";
type TableFilter = "all" | TableName;
type ModalState =
  | { kind: "form"; chip: IndexedChip | null }
  | { kind: "export" }
  | { kind: "import" }
  | { kind: "password" }
  | null;

const TABLES: TableName[] = ["eMMC", "eMCP"];

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (cryptoAvailable() ? "login" : "unsupported"));
  const [vault, setVault] = useState<Vault | null>(null);
  const [dataKey, setDataKey] = useState<CryptoKey | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [items, setItems] = useState<IndexedChip[]>([]);

  const [query, setQuery] = useState("");
  const [table, setTable] = useState<TableFilter>("all");
  const [group, setGroup] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const [storageBlocked, setStorageBlocked] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const isOwner = role === "owner";

  /* Máy đã có kho thì hỏi mật khẩu, chưa có thì mời đặt lần đầu. */
  useEffect(() => {
    if (!cryptoAvailable()) return;
    const existing = readVault();
    setVault(existing);
    setScreen(existing ? "login" : "setup");
  }, []);

  const showToast = useCallback((text: string) => setToast(text), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  /* Mọi thay đổi kho đều mã hoá lại rồi mới ghi xuống máy. */
  const persist = useCallback(
    async (nextItems: ChipItem[], currentVault: Vault | null, key: CryptoKey | null) => {
      if (!currentVault || !key) return;
      const data = await encryptItems(key, nextItems.map(stripIndex));
      const nextVault = { ...currentVault, data };
      setVault(nextVault);
      if (!writeVault(nextVault)) setStorageBlocked(true);
    },
    [],
  );

  const commit = useCallback(
    (nextItems: IndexedChip[]) => {
      setItems(nextItems);
      void persist(nextItems, vault, dataKey);
    },
    [persist, vault, dataKey],
  );

  const handleCreate = useCallback(
    async (ownerPassword: string, staffPassword: string) => {
      // Kho cũ của bản HTML một file, nếu có, được mang sang thay vì bắt nhập lại.
      const startItems = readLegacyItems() ?? buildSeedItems();
      const { vault: created, key } = await createVault(ownerPassword, staffPassword, startItems);
      if (!writeVault(created)) setStorageBlocked(true);
      clearLegacyItems();
      setVault(created);
      setDataKey(key);
      setRole("owner");
      setItems(indexAll(startItems));
      setScreen("app");
      showToast("Đã tạo kho — anh đang vào với quyền chủ tiệm");
    },
    [showToast],
  );

  const handleUnlock = useCallback(
    async (password: string) => {
      if (!vault) return false;
      const opened = await openVault(password, vault);
      if (!opened) return false;
      const stored = await decryptItems(opened.key, vault.data);
      setDataKey(opened.key);
      setRole(opened.role);
      setItems(indexAll(stored));
      setScreen("app");
      return true;
    },
    [vault],
  );

  const handleForget = useCallback(() => {
    clearVault();
    setVault(null);
    setScreen("setup");
  }, []);

  const handleChangePassword = useCallback(
    async (current: string, nextOwner: string, nextStaff: string) => {
      if (!vault || !dataKey) return false;
      try {
        const next = await rekeyVault(vault, dataKey, current, nextOwner, nextStaff);
        setVault(next);
        if (!writeVault(next)) setStorageBlocked(true);
        setModal(null);
        showToast("Đã đổi mật khẩu — nhớ báo lại cho thợ");
        return true;
      } catch {
        return false;
      }
    },
    [vault, dataKey, showToast],
  );

  const saveItem = useCallback(
    (draft: Omit<ChipItem, "id">) => {
      const editing = modal?.kind === "form" ? modal.chip : null;
      if (editing) {
        commit(items.map((it) => (it.id === editing.id ? indexChip({ ...draft, id: editing.id }) : it)));
        showToast(`Đã lưu ${draft.code}`);
      } else {
        commit([...items, indexChip({ ...draft, id: newItemId() })]);
        showToast(`Đã thêm ${draft.code}`);
      }
      setModal(null);
    },
    [modal, items, commit, showToast],
  );

  const deleteItem = useCallback(
    (chip: IndexedChip) => {
      if (!confirm(`Xoá mã ${chip.code} khỏi kho?`)) return;
      commit(items.filter((it) => it.id !== chip.id));
      showToast(`Đã xoá ${chip.code}`);
    },
    [items, commit, showToast],
  );

  const importItems = useCallback(
    (next: ChipItem[]) => {
      commit(indexAll(next));
      setGroup(null);
      setModal(null);
      showToast(`Đã nhập ${next.length} mã`);
    },
    [commit, showToast],
  );

  function toggleTheme() {
    const root = document.documentElement;
    const current =
      root.getAttribute("data-theme") ??
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    root.setAttribute("data-theme", current === "dark" ? "light" : "dark");
  }

  /* Phím / nhảy vào ô tìm kiếm, tiện khi dùng máy tính bàn ở tiệm. */
  useEffect(() => {
    if (screen !== "app") return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || modal) return;
      if (document.activeElement === searchRef.current) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [screen, modal]);

  const hits = useMemo(() => searchChips(items, query, { table, group }), [items, query, table, group]);

  const groupsByTable = useMemo(() => {
    const summaries = new Map<string, GroupSummary>();
    for (const chip of items) {
      const key = `${chip.table}|${chip.group}`;
      const found = summaries.get(key);
      if (found) {
        found.count += 1;
      } else {
        summaries.set(key, {
          table: chip.table,
          name: chip.group,
          cap: chip.cap,
          note: chip.note,
          count: 1,
        });
      }
    }
    return [...summaries.values()];
  }, [items]);

  const visibleGroups = useMemo(
    () => groupsByTable.filter((g) => table === "all" || g.table === table),
    [groupsByTable, table],
  );

  /**
   * Kết quả tìm kiếm gom theo đúng cột trong bảng tra, để nhìn tiêu đề là biết
   * mã nằm cột nào — thứ mà thợ cần nhất khi đang cầm con chip trên tay.
   * Thứ tự cột giữ y như bảng gốc, trong mỗi cột giữ nguyên thứ tự xếp hạng.
   */
  const hitsByGroup = useMemo(() => {
    const buckets = new Map<string, { table: TableName; name: string; cap: string; hits: typeof hits }>();
    for (const hit of hits) {
      const key = `${hit.chip.table}|${hit.chip.group}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.hits.push(hit);
      } else {
        buckets.set(key, {
          table: hit.chip.table,
          name: hit.chip.group,
          cap: hit.chip.cap,
          hits: [hit],
        });
      }
    }
    const order = new Map(groupsByTable.map((g, i) => [`${g.table}|${g.name}`, i]));
    return [...buckets.entries()]
      .sort(([a], [b]) => (order.get(a) ?? 9999) - (order.get(b) ?? 9999))
      .map(([, bucket]) => bucket);
  }, [hits, groupsByTable]);

  const groupItems = useMemo(
    () => (group ? items.filter((it) => it.group === group && (table === "all" || it.table === table)) : []),
    [items, group, table],
  );

  if (screen === "unsupported") return <UnsupportedGate />;
  if (screen === "setup") return <SetupGate onCreate={handleCreate} />;
  if (screen === "login" || !role) return <LoginGate onUnlock={handleUnlock} onForget={handleForget} />;

  // Viền cam chỉ có nghĩa khi kết quả có lẫn loại khớp yếu hơn.
  const mixedScores = hits.some((hit) => hit.score > 0);
  const groupHead = groupItems[0];

  return (
    <div className="wrap">
      <header className="top">
        <LogoMark size={44} />
        <div className="logo-text">
          <b>{SHOP.name}</b>
          <span className="phone">{SHOP.phone}</span>
        </div>
        <div className="top-actions">
          <span className={isOwner ? "role owner" : "role"}>{isOwner ? "CHỦ TIỆM" : "THỢ"}</span>
          <button className="icon-btn" type="button" title="Đổi nền sáng/tối" onClick={toggleTheme}>
            ◐
          </button>
          {isOwner ? (
            <button
              className={manage ? "icon-btn on" : "icon-btn"}
              type="button"
              title="Chế độ quản lý"
              onClick={() => {
                setManage(!manage);
                showToast(manage ? "Tắt chế độ quản lý" : "Bật chế độ quản lý");
              }}
            >
              ✎
            </button>
          ) : null}
        </div>
      </header>

      {/* Nhóm nút lọc và nút quản lý đặt trên ô tìm kiếm, để ô tìm kiếm dính sát kết quả khi cuộn. */}
      <div className="controls">
        <div className="seg" role="tablist">
          {(["all", "eMMC", "eMCP"] as TableFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              className={table === value ? "on" : undefined}
              onClick={() => {
                setTable(value);
                setGroup(null);
              }}
            >
              {value === "all" ? "Tất cả" : value}
            </button>
          ))}
        </div>

        <div className="chips">
          <button className={group ? "chip" : "chip on"} type="button" onClick={() => setGroup(null)}>
            TẤT CẢ NHÓM
          </button>
          {visibleGroups.map((g) => (
            <button
              key={`${g.table}-${g.name}`}
              type="button"
              className={group === g.name ? "chip on" : "chip"}
              onClick={() => setGroup(g.name)}
            >
              {g.name}
            </button>
          ))}
        </div>

        {isOwner && manage ? (
          <div className="toolbar">
            <button className="btn primary" type="button" onClick={() => setModal({ kind: "form", chip: null })}>
              + Thêm mã
            </button>
            <button className="btn" type="button" onClick={() => setModal({ kind: "export" })}>
              Xuất Excel
            </button>
            <button className="btn" type="button" onClick={() => setModal({ kind: "import" })}>
              Nhập Excel
            </button>
            <button className="btn" type="button" onClick={() => setModal({ kind: "password" })}>
              Đổi mật khẩu
            </button>
          </div>
        ) : null}
      </div>

      <div className="search-dock">
        <div className="search">
          <span className="lens" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Gõ 3–4 ký tự đầu của mã, ví dụ KLMA…"
            aria-label="Tìm mã ổ cứng"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              className="clear"
              type="button"
              aria-label="Xoá ô tìm kiếm"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              ✕
            </button>
          ) : null}
        </div>
        <div className="hint">
          <span>
            {query
              ? hits.length
                ? `Tìm thấy ${hits.length} mã khớp “${query.toUpperCase()}”`
                : "Không có mã nào khớp"
              : "Không phân biệt hoa thường, bỏ qua dấu gạch nối"}
          </span>
          <span>
            <b>{items.length}</b> mã trong kho
          </span>
        </div>
      </div>

      <main aria-live="polite">
        {query ? (
          hits.length === 0 ? (
            <div className="empty">
              <strong>
                Không tìm thấy <code>{query.toUpperCase()}</code>
              </strong>
              Thử gõ ít ký tự hơn, hoặc bỏ bớt phần đuôi mã.
              {isOwner ? (
                <>
                  <br />
                  Nếu đây là mã mới, bấm <b>✎</b> ở góc trên rồi chọn <b>+ Thêm mã</b>.
                </>
              ) : null}
            </div>
          ) : (
            hitsByGroup.map((bucket) => (
              <Section
                key={`${bucket.table}-${bucket.name}`}
                title={`${bucket.table} · ${bucket.name}${bucket.cap ? ` · ${bucket.cap}` : ""}`}
                count={bucket.hits.length}
              >
                <div className="result-grid">
                  {bucket.hits.map(({ chip, score }) => (
                    <ChipRow
                      key={chip.id}
                      chip={chip}
                      query={query}
                      strong={mixedScores && score === 0}
                      showGroup={false}
                      canEdit={isOwner && manage}
                      onEdit={(target) => setModal({ kind: "form", chip: target })}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              </Section>
            ))
          )
        ) : group ? (
          <>
            <div className="back-bar">
              <button className="back" type="button" onClick={() => setGroup(null)}>
                ← Tất cả nhóm
              </button>
            </div>
            <Section
              title={groupHead?.cap ? `${group} · ${groupHead.cap}` : group}
              count={groupItems.length}
            >
              {groupHead?.note ? (
                <div className="group-note" style={{ marginBottom: 12 }}>
                  {groupHead.note}
                </div>
              ) : null}
              <div className="result-grid">
                {groupItems.map((chip) => (
                  <ChipRow
                    key={chip.id}
                    chip={chip}
                    query=""
                    strong={false}
                    canEdit={isOwner && manage}
                    onEdit={(target) => setModal({ kind: "form", chip: target })}
                    onDelete={deleteItem}
                  />
                ))}
              </div>
            </Section>
          </>
        ) : (
          TABLES.map((name) => {
            if (table !== "all" && table !== name) return null;
            const groups = groupsByTable.filter((g) => g.table === name);
            if (groups.length === 0) return null;
            const total = groups.reduce((sum, g) => sum + g.count, 0);
            return (
              <Section
                key={name}
                title={`Bảng ${name} · ${name === "eMMC" ? "theo dung lượng" : "theo nhóm chân"}`}
                count={total}
              >
                <GroupGrid
                  groups={groups}
                  onOpen={(target) => {
                    setGroup(target);
                    window.scrollTo(0, 0);
                  }}
                />
              </Section>
            );
          })
        )}
      </main>

      <footer>
        <b>{SHOP.name}</b> · <span className="phone">{SHOP.phone}</span>
        {storageBlocked ? (
          <>
            <br />
            Trình duyệt đang chặn lưu tự động — nhớ bấm Xuất Excel trước khi đóng trang.
          </>
        ) : null}
      </footer>

      {modal?.kind === "form" ? (
        <ItemFormModal
          chip={modal.chip}
          defaultTable={table === "eMCP" ? "eMCP" : "eMMC"}
          groupOptions={groupsByTable.map((g) => g.name)}
          onSave={saveItem}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === "export" ? (
        <ExportModal items={items} onClose={() => setModal(null)} />
      ) : null}
      {modal?.kind === "import" ? (
        <ImportModal onImport={importItems} onClose={() => setModal(null)} />
      ) : null}
      {modal?.kind === "password" ? (
        <PasswordModal onChange={handleChangePassword} onClose={() => setModal(null)} />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

/** Bỏ phần chỉ mục trước khi mã hoá — chỉ mục dựng lại được, không cần lưu. */
function stripIndex(chip: ChipItem): ChipItem {
  const { id, code, table, group, cap, note } = chip;
  return { id, code, table, group, cap, note };
}
