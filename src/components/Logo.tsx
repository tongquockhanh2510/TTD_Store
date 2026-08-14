import type { ReactNode } from "react";
import { SHOP } from "../config";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 44, className }: LogoMarkProps) {
  return (
    <img
      src="/logo.jpg"
      alt="TTD Store"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: "8px", objectFit: "cover" }}
    />
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
