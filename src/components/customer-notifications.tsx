"use client";

import Link from "next/link";
import { useState } from "react";
import type { CustomerNotification } from "@/lib/customer-bookings";

function notificationText(item: CustomerNotification) {
  if (item.to_status === "cancelled" && item.source === "customer") return "Đặt bàn của bạn đã được hủy.";
  if (item.to_status === "confirmed") return "Đặt bàn của bạn đã được nhà hàng xác nhận.";
  if (item.to_status === "pending") return "Yêu cầu đặt bàn của bạn đã được tiếp nhận.";
  return `Trạng thái đặt bàn: ${item.to_status}.`;
}

export function CustomerNotifications({ initialItems }: { initialItems: CustomerNotification[] }) {
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState("");
  async function markRead(id: string) {
    setMessage("");
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) { setMessage("Chưa thể cập nhật thông báo. Vui lòng thử lại."); return; }
      setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); }
  }
  if (!items.length) return <p className="empty-state">Chưa có thông báo đặt bàn.</p>;
  return <div className="notification-list" aria-live="polite">{message && <p className="booking-inline-error" role="alert">{message}</p>}{items.map((item) => <article key={item.id} className={item.read_at ? "notification-item is-read" : "notification-item"}><div><p className="meta-line">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(item.created_at))}</p><p>{notificationText(item)} <Link className="text-link" href={`/my-bookings/${item.booking_id}`}>Xem đặt bàn</Link></p></div>{!item.read_at && <button type="button" className="text-button" onClick={() => void markRead(item.id)}>Đánh dấu đã đọc</button>}</article>)}</div>;
}
