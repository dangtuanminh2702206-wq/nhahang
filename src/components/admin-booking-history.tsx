"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AdminBookingSummary } from "@/lib/admin";

const terminalStatuses = ["completed", "cancelled", "rejected", "no_show"];
const statusLabels: Record<string, string> = { completed: "Hoàn tất", cancelled: "Đã hủy", rejected: "Từ chối", no_show: "Không đến" };

export function AdminBookingHistory({ bookings }: { bookings: AdminBookingSummary[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const candidates = bookings.filter(booking => terminalStatuses.includes(booking.status));
  function close() { setSelected(null); setConfirmation(""); setReason(""); }
  async function remove(event: FormEvent<HTMLFormElement>, booking: AdminBookingSummary) {
    event.preventDefault();
    if (busy || confirmation !== booking.id || !reason.trim()) return;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "booking-delete", id: booking.id, expectedUpdatedAt: booking.updated_at, confirmation, reason: reason.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Không thể xóa. Hãy tải lại rồi thử lại.");
      close(); setMessage("Đã xóa booking và dữ liệu liên quan. Audit vẫn được giữ."); router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Chưa thể xóa. Hãy thử lại sau."); }
    finally { setBusy(false); }
  }
  return <section id="booking-history" aria-labelledby="booking-history-title" className="admin-section">
    <h2 id="booking-history-title">Xóa lịch sử đặt bàn</h2>
    <p>Danh sách theo khoảng ngày báo cáo phía dưới. Chỉ xóa booking đã kết thúc, đã qua giờ kết thúc và không còn đơn món đang xử lý.</p>
    <p className="booking-error"><strong>Xóa vĩnh viễn:</strong> booking, đơn món gắn với booking, chi tiết món, lịch sử và thông báo liên quan sẽ bị xóa. Không có hoàn tác trên website; audit và dữ liệu khách khác được giữ.</p>
    {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    {!candidates.length && <p>Không có booking ở trạng thái kết thúc trong khoảng ngày này.</p>}
    <div className="admin-list">{candidates.map(booking => <div key={booking.id} className="admin-list-row">
      <div><strong>{booking.contact_name || "Khách chưa đặt tên"}</strong><p>Mã: {booking.id}</p><p>{statusLabels[booking.status]} · {new Date(booking.starts_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></div>
      {selected !== booking.id ? <button type="button" className="button button-secondary" disabled={busy} onClick={() => { close(); setSelected(booking.id); }}>Xóa booking này</button> :
        <form className="admin-form-grid" aria-label={`Xác nhận xóa booking ${booking.id}`} onSubmit={event => remove(event, booking)}>
          <label>Nhập toàn bộ mã booking để xác nhận<input autoFocus value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={busy} autoComplete="off" /></label>
          <label>Lý do xóa<input value={reason} onChange={event => setReason(event.target.value)} required maxLength={500} disabled={busy} /></label>
          <button type="button" className="button button-secondary" disabled={busy} onClick={close}>Giữ lại booking</button>
          <button type="submit" className="button button-secondary booking-error" disabled={busy || confirmation !== booking.id || !reason.trim()}>{busy ? "Đang xóa…" : "Xác nhận xóa vĩnh viễn"}</button>
        </form>}
    </div>)}</div>
  </section>;
}
