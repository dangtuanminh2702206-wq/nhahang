"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderView } from "@/lib/order-shared";
import { orderStatusLabel } from "@/lib/order-shared";

export function StaffOrderPanel({ initialOrder, enabled }: { initialOrder: OrderView | null; enabled: boolean }) {
  const router = useRouter();
  const attempt = useRef<{ payload: string; requestId: string } | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [reason, setReason] = useState("");
  if (!enabled) return <section className="order-section"><p className="eyebrow">Đơn món</p><h2>Module đặt món chưa bật.</h2><p className="small-note">Cần migration và feature gate live trước khi Staff xử lý đơn món.</p></section>;
  if (!initialOrder) return <section className="order-section"><p className="eyebrow">Đơn món</p><h2>Chưa có đơn món.</h2><p className="small-note">Customer chưa gửi món cho booking này.</p></section>;
  const order = initialOrder;
  const actions = order.status === "pending" ? [{ action: "confirm", label: "Xác nhận" }, { action: "cancel", label: "Hủy đơn" }] : order.status === "confirmed" ? [{ action: "preparing", label: "Bắt đầu chuẩn bị" }, { action: "cancel", label: "Hủy đơn" }] : order.status === "preparing" ? [{ action: "served", label: "Đã phục vụ" }, { action: "cancel", label: "Hủy đơn" }] : [];
  async function run(action: string) {
    setMessage(""); if (action === "cancel" && !reason.trim()) { setMessage("Hãy nhập lý do hủy đơn."); return; }
    const payload = JSON.stringify({ orderId: order.id, action, reason: reason.trim() || null, expectedVersion: order.version });
    if (!attempt.current || attempt.current.payload !== payload) attempt.current = { payload, requestId: crypto.randomUUID() };
    setBusy(true);
    try {
      const response = await fetch("/api/staff/orders/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), requestId: attempt.current.requestId }) });
      const result = await response.json().catch(() => null) as { message?: string } | null;
      setMessage(response.ok ? "Đã cập nhật đơn món." : result?.message ?? "Chưa thể cập nhật đơn món.");
      if (response.ok || response.status === 409) router.refresh();
    } catch { setMessage("Không thể kết nối tới máy chủ."); }
    finally { setBusy(false); }
  }
  return <section className="order-section" aria-labelledby="staff-order-title"><div className="booking-section-heading"><div><p className="eyebrow">Staff · Đơn món</p><h2 id="staff-order-title">Xử lý món của booking.</h2></div><p className="section-note">Giá và tên món là snapshot tại thời điểm Customer gửi đơn.</p></div><div className="order-status-line"><span>Trạng thái: <strong className={`status status-${order.status}`}>{orderStatusLabel(order.status)}</strong></span><span>Tổng dự kiến: <strong>{new Intl.NumberFormat("vi-VN").format(order.total_amount)}đ</strong></span></div><ul className="order-line-list">{order.items.map((item) => <li key={item.id}><span>{item.quantity} × {item.item_name}<small>{item.item_type === "combo" ? "Combo" : item.item_code}</small></span><strong>{new Intl.NumberFormat("vi-VN").format(item.line_total)}đ</strong></li>)}</ul>{actions.length > 0 && <div className="staff-order-actions">{actions.map((item) => <button key={item.action} type="button" className={item.action === "cancel" ? "button button-secondary" : "button button-primary"} disabled={busy} onClick={() => void run(item.action)}>{busy ? "Đang xử lý…" : item.label}</button>)}</div>}{actions.some((item) => item.action === "cancel") && <label className="staff-reason">Lý do hủy<textarea value={reason} maxLength={500} rows={2} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label>}<p className="order-message" role="alert" aria-live="polite">{message}</p><p className="small-note">Thanh toán trực tiếp tại quầy nhà hàng.</p></section>;
}
