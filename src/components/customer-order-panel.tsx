"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderCatalogueItem, OrderView } from "@/lib/order-shared";
import { orderStatusLabel } from "@/lib/order-shared";

type Props = { bookingId: string; bookingStatus: string; initialOrder: OrderView | null; catalogue: OrderCatalogueItem[]; enabled: boolean };
function formatVnd(value: number) { return new Intl.NumberFormat("vi-VN").format(value) + "đ"; }
function itemKey(item: Pick<OrderCatalogueItem, "kind" | "code">) { return `${item.kind}:${item.code}`; }

export function CustomerOrderPanel({ bookingId, bookingStatus, initialOrder, catalogue, enabled }: Props) {
  // Refresh preserves client state. A new server version must not reuse an old draft.
  return <CustomerOrderDraft key={`${bookingId}:${initialOrder?.id ?? "new"}:${initialOrder?.version ?? 0}`} bookingId={bookingId} bookingStatus={bookingStatus} initialOrder={initialOrder} catalogue={catalogue} enabled={enabled} />;
}

function CustomerOrderDraft({ bookingId, bookingStatus, initialOrder, catalogue, enabled }: Props) {
  const router = useRouter();
  const attempt = useRef<{ payload: string; requestId: string } | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries((initialOrder?.items ?? []).map((item) => [`${item.item_type}:${item.item_code}`, item.quantity])));
  const order = initialOrder;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const editable = enabled && order?.status === "pending";
  const canCreate = enabled && !order && ["confirmed", "checked_in"].includes(bookingStatus);
  const selected = catalogue.filter((item) => (quantities[itemKey(item)] ?? 0) > 0 && item.available);
  const total = selected.reduce((sum, item) => sum + item.price * (quantities[itemKey(item)] ?? 0), 0);

  function setQuantity(item: OrderCatalogueItem, raw: string) {
    if (!/^\d*$/.test(raw)) return;
    const value = raw === "" ? 0 : Number(raw);
    if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) return;
    setQuantities((current) => ({ ...current, [itemKey(item)]: value }));
  }

  async function submit(action: "create" | "update" | "cancel") {
    setMessage("");
    if (action !== "cancel" && selected.length === 0) { setMessage("Hãy chọn ít nhất một món trước khi gửi."); return; }
    const payload = JSON.stringify({
      action, bookingId, orderId: order?.id, expectedVersion: order?.version,
      items: selected.map((item) => ({ kind: item.kind, code: item.code, quantity: quantities[itemKey(item)] })),
    });
    if (!attempt.current || attempt.current.payload !== payload) attempt.current = { payload, requestId: crypto.randomUUID() };
    setBusy(true);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(payload), requestId: attempt.current.requestId }) });
      const result = await response.json().catch(() => null) as { message?: string; order?: { status: string; version: number; totalAmount: number } } | null;
      if (!response.ok || !result?.order) { setMessage(result?.message ?? "Chưa thể gửi đơn món."); if (response.status === 409) router.refresh(); return; }
      setMessage(action === "cancel" ? "Đơn món đã được hủy." : "Đơn món đã được gửi. Nhà hàng sẽ xác nhận.");
      router.refresh();
    } catch { setMessage("Không thể kết nối tới máy chủ. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }

  if (!enabled) return <section className="order-section" aria-labelledby="order-title"><p className="eyebrow">Đặt món tại bàn</p><h2 id="order-title">Đặt món online đang chờ mở.</h2><p className="small-note">Booking vẫn hoạt động bình thường. Module đặt món sẽ mở sau khi migration và kiểm thử dữ liệu live hoàn tất.</p></section>;
  if (!["confirmed", "checked_in"].includes(bookingStatus) && !order) return <section className="order-section" aria-labelledby="order-title"><p className="eyebrow">Đặt món tại bàn</p><h2 id="order-title">Chờ nhà hàng xác nhận booking.</h2><p className="small-note">Bạn có thể gửi món sau khi booking được xác nhận.</p></section>;

  return <section className="order-section" aria-labelledby="order-title">
    <div className="booking-section-heading"><div><p className="eyebrow">Đặt món tại bàn</p><h2 id="order-title">Chọn món trước giờ dùng bữa.</h2></div><p className="section-note">Không quản lý tồn kho. Số lượng chỉ cần là số nguyên dương.</p></div>
    {order && <div className="order-status-line"><span>Trạng thái: <strong className={`status status-${order.status}`}>{orderStatusLabel(order.status)}</strong></span><span>Tổng dự kiến: <strong>{formatVnd(order.total_amount)}</strong></span></div>}
    {order && <ul className="order-line-list" aria-label="Món đã gửi">{order.items.map((item) => <li key={item.id}><span>{item.quantity} × {item.item_name}<small>{formatVnd(item.unit_price)} / {item.item_type === "combo" ? "combo" : "món"}</small></span><strong>{formatVnd(item.line_total)}</strong></li>)}</ul>}
    {order && <ol className="order-history" aria-label="Lịch sử đơn món">{order.history.map((event) => <li key={event.id}><span>{orderStatusLabel(event.to_status)}</span>{event.reason && <small>{event.reason}</small>}</li>)}</ol>}
    {(canCreate || editable) && <fieldset className="order-catalogue" disabled={busy}>
      <legend>{editable ? "Cập nhật đơn đang chờ" : "Chọn món và combo"}</legend>
      {editable && <p className="small-note">Nếu đơn được cập nhật ở nơi khác, form sẽ tải lại số lượng mới nhất. Hãy kiểm tra lại trước khi lưu.</p>}
      {catalogue.map((item) => <label className="order-catalogue-row" key={itemKey(item)}><span><strong>{item.name}</strong><small>{item.kind === "combo" ? "Combo" : "Món lẻ"} · {formatVnd(item.price)}{!item.available && " · Tạm hết"}</small></span><input aria-label={`Số lượng ${item.name}`} type="number" inputMode="numeric" min="0" max="2147483647" step="1" value={quantities[itemKey(item)] ?? 0} disabled={!item.available} onChange={(event) => setQuantity(item, event.target.value)} /></label>)}
      <div className="order-summary"><span>Tổng dự kiến</span><strong>{formatVnd(total)}</strong></div>
      <button className="button button-primary" type="button" onClick={() => void submit(order ? "update" : "create")}>{busy ? "Đang gửi…" : order ? "Cập nhật đơn món" : "Gửi đơn món"}</button>
    </fieldset>}
    {enabled && order?.status === "pending" && <div className="order-cancel-panel"><button className="button button-secondary" type="button" disabled={busy} onClick={() => void submit("cancel")}>{busy ? "Đang xử lý…" : "Hủy đơn món"}</button></div>}
    {order && ["confirmed", "preparing"].includes(order.status) && <p className="small-note">Đơn đã được nhà hàng tiếp nhận; hãy liên hệ Staff nếu cần thay đổi.</p>}
    <p className="order-payment-note">Thanh toán trực tiếp tại quầy nhà hàng.</p>
    <p className="order-message" role={message && !message.includes("đã") ? "alert" : "status"} aria-live="polite">{message}</p>
  </section>;
}
