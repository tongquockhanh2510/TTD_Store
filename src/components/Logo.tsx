import { useId, type ReactNode } from "react";
import { SHOP } from "../config";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Logo tiệm: dáng điện thoại đứng, hai bên mọc chân IC như con eMMC nhìn từ trên,
 * trong màn hình là chữ TTD nghiêng đậm vẽ bằng path (không dùng <text>, không
 * phụ thuộc font máy người xem). Ba thứ nghề này nằm gọn trong một hình: máy, chip, chữ tiệm.
 */
export function LogoMark({ size = 44, className }: LogoMarkProps) {
  // useId để nhiều logo trên cùng trang không giành nhau id của gradient.
  const gid = useId();
  const bodyGradient = `ttd-body-${gid}`;
  const pinGradient = `ttd-pin-${gid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      role="img"
      aria-label={SHOP.name}
    >
      <defs>
        <linearGradient id={bodyGradient} x1="7" y1="2" x2="33" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF9440" />
          <stop offset="0.55" stopColor="#FF7A18" />
          <stop offset="1" stopColor="#C24C05" />
        </linearGradient>
        <linearGradient id={pinGradient} x1="0" y1="20" x2="40" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF7A18" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#FF9440" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FF7A18" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* chân IC hai bên — dấu hiệu của con chip dán */}
      <g fill={`url(#${pinGradient})`}>
        <rect x="0.5" y="10.7" width="6" height="2.6" rx="1.3" />
        <rect x="0.5" y="18.7" width="6" height="2.6" rx="1.3" />
        <rect x="0.5" y="26.7" width="6" height="2.6" rx="1.3" />
        <rect x="33.5" y="10.7" width="6" height="2.6" rx="1.3" />
        <rect x="33.5" y="18.7" width="6" height="2.6" rx="1.3" />
        <rect x="33.5" y="26.7" width="6" height="2.6" rx="1.3" />
      </g>

      {/* thân máy */}
      <rect x="7" y="2" width="26" height="36" rx="6.5" fill={`url(#${bodyGradient})`} />

      {/* màn hình */}
      <rect x="10.4" y="6.4" width="19.2" height="27.2" rx="3.6" fill="#0C0F11" />

      {/* khe loa */}
      <rect x="17" y="4" width="6" height="1.3" rx="0.65" fill="#0C0F11" opacity="0.45" />

      {/* dấu chân số 1 — chi tiết thật trên mọi con IC */}
      <circle cx="13.1" cy="9.1" r="0.85" fill="#FFB067" opacity="0.5" />

      {/* chữ TTD: vẽ bằng path rồi nghiêng, không phụ thuộc font của máy người xem */}
      <g fill="#FFC08A" transform="translate(12.68 16.48) skewX(-11) scale(0.88)">
        <rect x="0" y="0" width="5" height="1.95" />
        <rect x="1.55" y="0" width="1.95" height="8" />
        <rect x="6.2" y="0" width="5" height="1.95" />
        <rect x="7.75" y="0" width="1.95" height="8" />
        <path
          fillRule="evenodd"
          d="M12.4 0h2.4a3.4 4 0 0 1 0 8h-2.4zM14.35 1.95h0.45a1.5 2.1 0 0 1 0 4.1h-0.45z"
        />
      </g>
    </svg>
  );
}

interface LogoProps {
  size?: number;
  /** Dòng nhỏ dưới tên tiệm — nhận cả link, ví dụ số điện thoại bấm gọi được. */
  tagline?: ReactNode;
  className?: string;
}

/** Logo đầy đủ: hình + tên tiệm + dòng mô tả. */
export function Logo({ size = 44, tagline, className }: LogoProps) {
  return (
    <div className={className ? `logo ${className}` : "logo"}>
      <LogoMark size={size} />
      <div className="logo-text">
        <b>{SHOP.name}</b>
        {tagline ? <span>{tagline}</span> : null}
      </div>
    </div>
  );
}
