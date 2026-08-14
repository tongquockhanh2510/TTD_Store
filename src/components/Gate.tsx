import { useState, type FormEvent } from "react";
import { Logo } from "./Logo";
import { SHOP } from "../config";

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
    if (!confirm("Xoá toàn bộ kho đã mã hoá trên máy này và làm lại với mật khẩu mặc định?")) return;
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
        <p className="lead">Dùng mật khẩu mặc định của tiệm để mở kho.</p>

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
