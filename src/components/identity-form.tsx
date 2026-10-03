"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TrustedProfile } from "@/lib/identity";

export function IdentityForm({ mode, profile }: { mode: "login" | "signup" | "profile" | "forgot-password" | "reset-password"; profile?: Pick<TrustedProfile, "full_name" | "phone"> }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [updated, setUpdated] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setPending(true); setMessage("");
    try {
      const response = await fetch(mode === "forgot-password" || mode === "reset-password" ? "/auth/password" : "/auth/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, ...Object.fromEntries(values) }),
      });
      const result = await response.json() as { message?: string; redirect?: string; updated?: boolean };
      if (response.ok && result.redirect === "/profile") { router.replace("/profile"); router.refresh(); return; }
      if (response.ok && result.redirect === "/login?password=updated") { router.replace(result.redirect); router.refresh(); return; }
      if (response.ok && result.updated) { setUpdated(true); form.reset(); }
      setFailed(!response.ok);
      setMessage(result.message || "Chưa thể hoàn tất thao tác. Vui lòng thử lại.");
      if (response.ok && (mode === "signup" || mode === "forgot-password")) form.reset();
    } catch { setFailed(true); setMessage("Không thể kết nối. Vui lòng thử lại."); }
    finally { setPending(false); requestAnimationFrame(() => messageRef.current?.focus()); }
  }
  return <form className="identity-form" method="post" action={mode === "forgot-password" || mode === "reset-password" ? "/auth/password" : "/auth/session"} onSubmit={submit} aria-busy={pending}>
    <p ref={messageRef} tabIndex={-1} role={failed ? "alert" : "status"} className="identity-message">{message}</p>
    <fieldset disabled={pending || updated}>
      <legend className="sr-only">{mode === "profile" ? "Chỉnh sửa hồ sơ" : "Thông tin tài khoản"}</legend>
      {mode === "profile" ? <>
        <label htmlFor="identity-name">Họ và tên<input id="identity-name" name="full_name" autoComplete="name" required maxLength={120} defaultValue={profile?.full_name} /></label>
        <label htmlFor="identity-phone">Điện thoại<input id="identity-phone" name="phone" type="tel" autoComplete="tel" maxLength={32} defaultValue={profile?.phone || ""} /></label>
      </> : <>
        {mode !== "reset-password" && <label htmlFor="identity-email">Email<input id="identity-email" name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
        {mode !== "forgot-password" && <>
          <label htmlFor="identity-password">{mode === "reset-password" ? "Mật khẩu mới" : "Mật khẩu"}<input id="identity-password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} aria-describedby="password-hint" /></label>
          <p id="password-hint" className="small-note">Mật khẩu từ 8 đến 128 ký tự. Bạn có thể dán hoặc dùng trình quản lý mật khẩu.</p>
        </>}
        {mode === "reset-password" && <label htmlFor="identity-password-confirmation">Nhập lại mật khẩu mới<input id="identity-password-confirmation" name="password_confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>}
      </>}
      <button className="button button-primary" type="submit">{pending ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : mode === "signup" ? "Đăng ký Customer" : mode === "forgot-password" ? "Gửi liên kết khôi phục" : mode === "reset-password" ? "Lưu mật khẩu mới" : "Lưu hồ sơ"}</button>
    </fieldset>
  </form>;
}
