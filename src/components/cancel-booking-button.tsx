"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelBookingButton({ bookingId, disabled = false }: { bookingId: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function cancel() {
    if (pending || disabled || !window.confirm("Bạn có chắc muốn hủy yêu cầu đặt bàn này không?")) return;
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json() as { message?: string; booking?: { reason?: string } };
      if (!response.ok) { setMessage(result.message || "Chưa thể hủy đặt bàn."); return; }
      if (result.booking?.reason === "pending_expired") setMessage("Yêu cầu đã hết hạn chờ xác nhận và được hệ thống đóng.");
      router.refresh();
    } catch { setMessage("Không thể kết nối. Hãy mở lại trang để kiểm tra trạng thái."); }
    finally { setPending(false); }
  }
  return <div className="booking-cancel-action"><button className="button button-secondary" type="button" onClick={() => void cancel()} disabled={pending || disabled} aria-describedby={message ? `${bookingId}-cancel-message` : undefined}>{pending ? "Đang hủy…" : "Hủy đặt bàn"}</button>{message && <p id={`${bookingId}-cancel-message`} className="booking-inline-error" role="alert" tabIndex={-1}>{message}</p>}</div>;
}
