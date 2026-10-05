"use client";
import { useRef, useState } from "react";
import { FloorPlan } from "@/components/floor-plan";
import { restaurantFloors as canonicalFloors, type RestaurantFloor } from "@/data/restaurant";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AvailableTable } from "@/lib/booking-input";

export function ReservationPreview({ demo = true, mutationsEnabled = false, floors = canonicalFloors }: { demo?: boolean; mutationsEnabled?: boolean; floors?: readonly RestaurantFloor[] }) {
  const restaurantFloors = floors;
  const searchParams = useSearchParams();
  const initialFloor = restaurantFloors.find(floor => floor.slug === searchParams.get("floor")) ?? restaurantFloors[0];
  const initialTable = initialFloor.tables.find(table => table.code === searchParams.get("table")) ?? initialFloor.tables[0];
  const [floorSlug, setFloorSlug] = useState(initialFloor.slug);
  const [tableCode, setTableCode] = useState(initialTable.code);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [guests, setGuests] = useState("2");
  const [confirmed, setConfirmed] = useState(false);
  const [available, setAvailable] = useState<AvailableTable[] | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const requestKey = useRef<string | null>(null);
  const busy = useRef(false);
  const revision = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const floor = restaurantFloors.find((item) => item.slug === floorSlug) ?? restaurantFloors[0];
  const selected = available?.find(table => table.table_code === tableCode && table.area_code === floor.areaCode);
  function invalidate() {
    revision.current++;
    setAvailable(null);
    setMessage("");
    setCreated(false);
    setCreatedBookingId(null);
    requestKey.current = null;
  }
  function notify(text: string, error = false) {
    setMessage(text); setFailed(error);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }
  async function findTables() {
    if (busy.current || !date || !time) { if (!busy.current) notify("Vui lòng chọn ngày và giờ để kiểm tra bàn.", true); return; }
    const current = revision.current;
    busy.current = true; setPending(true); setAvailable(null); setMessage("");
    try {
      const query = new URLSearchParams({ startsAt: `${date}T${time}:00+07:00`, guests });
      const response = await fetch(`/api/availability?${query}`, { cache: "no-store" });
      const result = await response.json();
      if (current !== revision.current) return;
      if (!response.ok) { notify(result.message || "Chưa thể kiểm tra bàn.", true); return; }
      setAvailable(result.tables);
      notify(result.tables.length ? "Đã kiểm tra bàn. Chọn bàn phù hợp; kết quả này chưa giữ chỗ." : "Không có bàn phù hợp. Hãy đổi thời gian hoặc số khách.");
    } catch { if (current === revision.current) notify("Không thể kết nối dịch vụ tìm bàn. Không có xác nhận bàn trống.", true); }
    finally { busy.current = false; setPending(false); }
  }
  async function submitBooking() {
    if (busy.current || created || !formRef.current?.reportValidity()) return;
    if (!mutationsEnabled) { notify("Chưa nhận đặt bàn thật.", true); return; }
    if (!selected) { notify("Hãy kiểm tra bàn và chọn bàn khả dụng trước.", true); return; }
    busy.current = true; setPending(true); setNeedsLogin(false);
    requestKey.current ??= crypto.randomUUID();
    const fields = new FormData(formRef.current);
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startsAt: `${date}T${time}:00+07:00`, guests: Number(guests), tableId: selected.table_id, idempotencyKey: requestKey.current, name: fields.get("name"), phone: fields.get("phone"), notes: fields.get("notes") }) });
      const result = await response.json();
      if (!response.ok) {
        setNeedsLogin(response.status === 401);
        if (response.status === 409 || response.status === 422) setAvailable(null);
        notify(result.message || "Chưa xác nhận kết quả. Thử lại cùng thông tin.", true); return;
      }
      setCreated(true);
      setCreatedBookingId(result.booking.id);
      notify(result.booking.status === "pending" ? `Đã tạo yêu cầu chờ xác nhận. Hạn chờ: ${new Date(result.booking.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Chưa phải xác nhận của nhà hàng.` : result.booking.status === "cancelled" ? "Yêu cầu trước đã hủy hoặc hết hạn. Không có đặt bàn mới được tạo từ lần retry này." : "Yêu cầu trước đã được xử lý. Không tạo thêm booking từ lần retry này.");
    } catch { notify("Chưa xác nhận kết quả. Hãy thử lại cùng thông tin; mã retry được giữ trong phiên trang.", true); }
    finally { busy.current = false; setPending(false); }
  }
  function confirmPreview() {
    if (!formRef.current?.reportValidity()) return;
    setConfirmed(true);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }
  return <>
    {!demo && <aside className="demo-notice"><strong>{mutationsEnabled ? "Gửi yêu cầu đặt bàn." : "Chưa nhận đặt bàn thật."}</strong><p>Kết quả tìm bàn chưa giữ chỗ. Yêu cầu được tạo ở trạng thái chờ; chỉ có đặt bàn xác nhận khi nhà hàng duyệt.</p>{mutationsEnabled && <p>Cần tài khoản Customer đã đăng nhập để gửi yêu cầu. <Link href="/login">Đăng nhập</Link></p>}</aside>}
    <form ref={formRef} method="post" action="/api/bookings" className="reservation-form" onSubmit={(event) => { event.preventDefault(); if (!demo) void submitBooking(); }} autoComplete="off" aria-busy={pending} onChange={() => { setConfirmed(false); setCreated(false); requestKey.current = null; }}>
      <fieldset disabled={pending}><legend><span>01</span> Thời gian & số khách</legend><div className="form-grid" onChange={invalidate}>
        <label htmlFor="preview-date">Ngày<input id="preview-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label htmlFor="preview-time">Giờ<select id="preview-time" value={time} onChange={(event) => setTime(event.target.value)}>{["10:00", "12:00", "14:00", "16:00", "18:00", "19:00", "20:00"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label htmlFor="preview-guests">Số khách<select id="preview-guests" value={guests} onChange={(event) => setGuests(event.target.value)}>{[1,2,3,4,5,6,7,8].map((item) => <option key={item} value={item}>{item} người</option>)}</select></label>
      </div><p className="small-note">{demo ? "Khung giờ và lựa chọn số khách chỉ để đánh giá UI, không phải chính sách đặt bàn đã triển khai." : "Giờ nhà hàng: Việt Nam (UTC+7). Chính sách và lịch phục vụ được kiểm tra lại bởi database."}</p>{!demo && <button type="button" className="button button-secondary" onClick={() => void findTables()} disabled={pending}>{pending ? "Đang xử lý…" : "Kiểm tra bàn"}</button>}</fieldset>
      {!demo && <div ref={summaryRef} tabIndex={-1} role={failed ? "alert" : "status"} className={message ? "preview-confirmation" : ""}>{message && <p>{message}</p>}{created && createdBookingId && <Link className="text-link" href={`/my-bookings/${createdBookingId}`}>Xem chi tiết đặt bàn</Link>}{failed && !date && message && <a href="#preview-date">Chọn ngày đặt bàn</a>}{needsLogin && <Link href="/login">Đăng nhập rồi kiểm tra bàn lại</Link>}</div>}
      <fieldset disabled={pending}><legend><span>02</span> Không gian & bàn</legend><div className="form-grid form-grid-two"><label htmlFor="preview-floor">Tầng<select id="preview-floor" value={floorSlug} onChange={(event) => { const next = restaurantFloors.find((item) => item.slug === event.target.value)!; setFloorSlug(next.slug); setTableCode(next.tables[0].code); }}>{restaurantFloors.map((item) => <option key={item.slug} value={item.slug}>Tầng {item.level} · {item.name}</option>)}</select></label><label htmlFor="preview-table">Bàn đang xem<select id="preview-table" value={tableCode} onChange={(event) => setTableCode(event.target.value)}>{floor.tables.map((table) => <option key={table.code} value={table.code} disabled={available !== null && !available.some(item => item.table_code === table.code)}>{table.code} · {table.capacity} chỗ · {table.position}{available !== null && !available.some(item => item.table_code === table.code) ? " · không khả dụng" : ""}</option>)}</select></label></div>
        <FloorPlan key={floor.slug} floor={floor} selectedCode={tableCode} availableCodes={available?.map(table => table.table_code)} onTableSelect={(table) => { setTableCode(table.code); setConfirmed(false); setCreated(false); requestKey.current = null; }} />
      </fieldset>
      <fieldset disabled={pending || (!demo && !mutationsEnabled)}><legend><span>03</span> Thông tin khách · Dữ liệu thử</legend><div className="form-grid form-grid-two"><label htmlFor="preview-name">Tên khách<input id="preview-name" name="name" required maxLength={120} placeholder="Ví dụ: Khách demo" /></label><label htmlFor="preview-phone">Điện thoại<input id="preview-phone" name="phone" type="tel" required pattern="[0-9+ ().-]{8,32}" maxLength={32} placeholder="Ví dụ: 0900000000" /></label></div><label htmlFor="preview-note">Ghi chú (không bắt buộc)<textarea id="preview-note" name="notes" maxLength={1000} rows={3} placeholder="Ghi chú thử nghiệm" /></label></fieldset>
      <div className="reservation-confirm">{!demo && <p className="small-note">{mutationsEnabled ? "Thông tin liên hệ chỉ được gửi khi bạn bấm gửi yêu cầu đặt bàn." : "Tạo booking đang tắt. Không gửi thông tin liên hệ."}</p>}{demo ? <button type="button" className="button button-primary" onClick={confirmPreview}>Xem xác nhận mô phỏng ↗</button> : <button type="submit" className="button button-primary" disabled={!mutationsEnabled || !selected || pending || created}>{pending ? "Đang xử lý…" : "Gửi yêu cầu đặt bàn"}</button>}</div>
      {demo && <div ref={summaryRef} tabIndex={-1} role="status" className={confirmed ? "preview-confirmation" : ""}>{confirmed && <><p className="eyebrow">Tóm tắt lựa chọn · Chưa tạo đặt bàn</p><h2>{floor.name} · {tableCode}</h2><p>{date.split("-").reverse().join("/")} · {time} · {guests} khách</p><p>Đây là kết quả mô phỏng giao diện, không phải xác nhận giữ bàn. Không có dữ liệu nào được gửi đi.</p></>}</div>}
    </form>
  </>;
}
