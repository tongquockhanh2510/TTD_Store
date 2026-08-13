import { useState, type FormEvent } from "react";
import { Logo } from "./Logo";
import { SHOP } from "../config";

interface SetupGateProps {
  onCreate: (ownerPassword: string, staffPassword: string) => Promise<void>;
}

/** Màn hình đặt mật khẩu lần đầu — chạy khi máy chưa có kho nào. */
export function SetupGate({ onCreate }: SetupGateProps) {
  const [owner, setOwner] = useState("");
  const [ownerAgain, setOwnerAgain] = useState("");
  const [staff, setStaff] = useState("");
  const [staffAgain, setStaffAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (owner.length < 6 || staff.length < 6) {
      setError("Mỗi mật khẩu cần ít nhất 6 ký tự.");
      return;
    }
    if (owner !== ownerAgain) {
      setError("Hai lần nhập mật khẩu chủ không giống nhau.");
      return;
    }
    if (staff !== staffAgain) {
      setError("Hai lần nhập mật khẩu thợ không giống nhau.");
      return;
    }
    if (owner === staff) {
      setError("Mật khẩu chủ và mật khẩu thợ phải khác nhau, nếu không thì không phân quyền được.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      await onCreate(owner, staff);
    } catch (err) {
      setBusy(false);
      setError(`Không tạo được kho: ${err instanceof Error ? err.message : "lỗi mã hoá"}`);
    }
  }

  return (
    <div className="gate">
      <form className="gate-box" onSubmit={submit}>
        <Logo tagline={<span className="phone">{SHOP.phone}</span>} />
        <h1>Đặt mật khẩu lần đầu</h1>
        <p className="lead">
          Kho chip sẽ được mã hoá bằng hai mật khẩu này. Mật khẩu <b>không được lưu ở đâu cả</b> —
          quên là mất kho, không ai lấy lại được. Ghi ra giấy cất trong tủ trước khi bấm tạo.
        </p>

        <div className="field">
          <label htmlFor="own">Mật khẩu chủ tiệm — tra cứu và sửa được</label>
          <input
            id="own"
            type="password"
            autoComplete="new-password"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="own2">Nhập lại mật khẩu chủ</label>
          <input
            id="own2"
            type="password"
            autoComplete="new-password"
            value={ownerAgain}
            onChange={(e) => setOwnerAgain(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="stf">Mật khẩu thợ — chỉ tra cứu</label>
          <input
            id="stf"
            type="password"
            autoComplete="new-password"
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="stf2">Nhập lại mật khẩu thợ</label>
          <input
            id="stf2"
            type="password"
            autoComplete="new-password"
            value={staffAgain}
            onChange={(e) => setStaffAgain(e.target.value)}
          />
        </div>

        {error ? <div className="msg err">{error}</div> : null}
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Đang mã hoá…" : "Tạo kho và vào"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface LoginGateProps {
  onUnlock: (password: string) => Promise<boolean>;
  onForget: () => void;
}

/** Màn hình nhập mật khẩu khi máy đã có kho. */
export function LoginGate({ onUnlock, onForget }: LoginGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError("Chưa nhập mật khẩu.");
      return;
    }
    setError("");
    setBusy(true);
    const ok = await onUnlock(password);
    if (!ok) {
      setBusy(false);
      setPassword("");
      setError("Mật khẩu không đúng.");
    }
  }

  function forget() {
    if (!confirm("Xoá toàn bộ kho đã mã hoá trên máy này và đặt lại mật khẩu mới?")) return;
    if (
      !confirm(
        "Chắc chắn nhé — mọi mã anh tự thêm và ghi chú riêng sẽ mất, chỉ còn lại dữ liệu gốc từ 2 bảng ảnh.",
      )
    ) {
      return;
    }
    onForget();
  }

  return (
    <div className="gate">
      <form className="gate-box" onSubmit={submit}>
        <Logo tagline={<span className="phone">{SHOP.phone}</span>} />
        <h1>Nhập mật khẩu</h1>
        <p className="lead">Mật khẩu chủ mở đầy đủ quyền sửa. Mật khẩu thợ chỉ tra cứu.</p>

        <div className="field">
          <label htmlFor="pw">Mật khẩu</label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? <div className="msg err">{error}</div> : null}
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Đang mở…" : "Mở kho"}
          </button>
        </div>
        <button className="link-btn" type="button" onClick={forget}>
          Quên mật khẩu — xoá kho và làm lại từ đầu
        </button>
      </form>
    </div>
  );
}

/** Hiện khi trình duyệt không có Web Crypto (mở bằng http trần, không phải localhost). */
export function UnsupportedGate() {
  return (
    <div className="gate">
      <div className="gate-box">
        <Logo tagline={<span className="phone">{SHOP.phone}</span>} />
        <h1>Trình duyệt không hỗ trợ mã hoá</h1>
        <p className="lead">
          Trang cần Web Crypto để khoá kho, thứ này chỉ chạy trên kết nối https. Anh mở lại trang
          bằng đường dẫn https, hoặc dùng trình duyệt mới hơn (Chrome, Safari, Edge).
        </p>
      </div>
    </div>
  );
}
