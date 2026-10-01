"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TrustedProfile } from "@/lib/identity";

export function IdentityForm({ mode, profile }: { mode: "login" | "signup" | "profile"; profile?: Pick<TrustedProfile, "full_name" | "phone"> }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setPending(true); setMessage("");
    try {
      const response = await fetch("/auth/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, ...Object.fromEntries(values) }),
      });
      const result = await response.json() as { message?: string; redirect?: string };
      if (response.ok && result.redirect === "/profile") { router.replace("/profile"); router.refresh(); return; }
      setFailed(!response.ok);
      setMessage(result.message || "Chưa thể hoàn tất thao tác. Vui lòng thử lại.");
      if (response.ok && mode === "signup") form.reset();
    } catch { setFailed(true); setMessage("Không thể kết nối. Vui lòng thử lại."); }
    finally { setPending(false); requestAnimationFrame(() => messageRef.current?.focus()); }
  }
  return <form className="identity-form" onSubmit={submit} aria-busy={pending}>
    <p ref={messageRef} tabIndex={-1} role={failed ? "alert" : "status"} className="identity-message">{message}</p>
    <fieldset disabled={pending}>
      <legend className="sr-only">{mode === "profile" ? "Chỉnh sửa hồ sơ" : "Thông tin tài khoản"}</legend>
      {mode === "profile" ? <>
        <label htmlFor="identity-name">Họ và tên<input id="identity-name" name="full_name" autoComplete="name" required maxLength={120} defaultValue={profile?.full_name} /></label>
        <label htmlFor="identity-phone">Điện thoại<input id="identity-phone" name="phone" type="tel" autoComplete="tel" maxLength={32} defaultValue={profile?.phone || ""} /></label>
      </> : <>
        <label htmlFor="identity-email">Email<input id="identity-email" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label htmlFor="identity-password">Mật khẩu<input id="identity-password" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} maxLength={128} aria-describedby="password-hint" /></label>
        <p id="password-hint" className="small-note">Mật khẩu từ 8 đến 128 ký tự. Bạn có thể dán hoặc dùng trình quản lý mật khẩu.</p>
      </>}
      <button className="button button-primary" type="submit">{pending ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : mode === "signup" ? "Đăng ký Customer" : "Lưu hồ sơ"}</button>
    </fieldset>
  </form>;
}
