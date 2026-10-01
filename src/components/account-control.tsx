"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AccountControl() {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const demo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    fetch("/auth/session", { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((data: { authenticated?: boolean } | null) => setAuthenticated(!!data?.authenticated))
      .catch(() => { /* Navigation stays usable if session lookup fails. */ });
    return () => controller.abort();
  }, [pathname, demo]);
  if (demo) return null;
  async function logout() {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
      if (!response.ok) throw new Error("LOGOUT_FAILED");
      setAuthenticated(false);
      router.replace("/login");
      router.refresh();
      setPending(false);
    } catch { setMessage("Chưa thể đăng xuất. Vui lòng thử lại."); setPending(false); }
  }
  return <div className="account-control">{authenticated ? <><Link href="/profile">Hồ sơ</Link><button type="button" disabled={pending} onClick={logout}>{pending ? "Đang thoát…" : "Đăng xuất"}</button></> : <Link href="/login">Đăng nhập</Link>}{message && <p role="alert">{message}</p>}</div>;
}
