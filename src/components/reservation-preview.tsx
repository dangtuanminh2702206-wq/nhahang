"use client";
import { useRef, useState } from "react";
import { FloorPlan } from "@/components/floor-plan";
import { restaurantFloors } from "@/data/restaurant";

export function ReservationPreview() {
  const [floorSlug, setFloorSlug] = useState(restaurantFloors[0].slug);
  const [tableCode, setTableCode] = useState(restaurantFloors[0].tables[0].code);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [guests, setGuests] = useState("2");
  const [confirmed, setConfirmed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const floor = restaurantFloors.find((item) => item.slug === floorSlug) ?? restaurantFloors[0];
  function confirmPreview() {
    if (!formRef.current?.reportValidity()) return;
    setConfirmed(true);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }
  return <>
    <aside className="demo-notice"><strong>Đây chỉ là bản thử giao diện.</strong><p>Không gửi thông tin, không giữ chỗ và chưa kiểm tra bàn trống. Vui lòng chỉ nhập dữ liệu giả để thử. Số chỗ là cấu hình catalogue, không phải khả dụng đặt bàn.</p></aside>
    <form ref={formRef} className="reservation-form" onSubmit={(event) => event.preventDefault()} autoComplete="off" onChange={() => setConfirmed(false)}>
      <fieldset><legend><span>01</span> Thời gian & số khách</legend><div className="form-grid">
        <label htmlFor="preview-date">Ngày<input id="preview-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label htmlFor="preview-time">Giờ<select id="preview-time" value={time} onChange={(event) => setTime(event.target.value)}>{["10:00", "12:00", "14:00", "16:00", "18:00", "19:00", "20:00"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label htmlFor="preview-guests">Số khách<select id="preview-guests" value={guests} onChange={(event) => setGuests(event.target.value)}>{[1,2,3,4,5,6,7,8].map((item) => <option key={item} value={item}>{item} người</option>)}</select></label>
      </div><p className="small-note">Khung giờ và lựa chọn số khách chỉ để đánh giá UI, không phải chính sách đặt bàn đã triển khai.</p></fieldset>
      <fieldset><legend><span>02</span> Không gian & bàn</legend><div className="form-grid form-grid-two"><label htmlFor="preview-floor">Tầng<select id="preview-floor" value={floorSlug} onChange={(event) => { const next = restaurantFloors.find((item) => item.slug === event.target.value)!; setFloorSlug(next.slug); setTableCode(next.tables[0].code); }}>{restaurantFloors.map((item) => <option key={item.slug} value={item.slug}>Tầng {item.level} · {item.name}</option>)}</select></label><label htmlFor="preview-table">Bàn đang xem<select id="preview-table" value={tableCode} onChange={(event) => setTableCode(event.target.value)}>{floor.tables.map((table) => <option key={table.code} value={table.code}>{table.code} · {table.capacity} chỗ · {table.position}</option>)}</select></label></div>
        <FloorPlan key={floor.slug} floor={floor} selectedCode={tableCode} onTableSelect={(table) => { setTableCode(table.code); setConfirmed(false); }} />
      </fieldset>
      <fieldset><legend><span>03</span> Thông tin khách · Dữ liệu thử</legend><div className="form-grid form-grid-two"><label htmlFor="preview-name">Tên khách<input id="preview-name" required maxLength={80} placeholder="Ví dụ: Khách demo" /></label><label htmlFor="preview-phone">Điện thoại<input id="preview-phone" type="tel" required pattern="[0-9+ ().-]{8,20}" maxLength={20} placeholder="Ví dụ: 0900000000" /></label></div><label htmlFor="preview-note">Ghi chú (không bắt buộc)<textarea id="preview-note" maxLength={300} rows={3} placeholder="Ghi chú thử nghiệm" /></label></fieldset>
      <div className="reservation-confirm"><p className="small-note">Thông tin chỉ nằm trong phiên xem trang; không lưu trữ hay gửi đến nhà hàng.</p><button type="button" className="button button-primary" onClick={confirmPreview}>Xem xác nhận mô phỏng ↗</button></div>
      <div ref={summaryRef} tabIndex={-1} role="status" className={confirmed ? "preview-confirmation" : ""}>{confirmed && <><p className="eyebrow">Tóm tắt lựa chọn · Chưa tạo đặt bàn</p><h2>{floor.name} · {tableCode}</h2><p>{date.split("-").reverse().join("/")} · {time} · {guests} khách</p><p>Đây là kết quả mô phỏng giao diện, không phải xác nhận giữ bàn. Không có dữ liệu nào được gửi đi.</p></>}</div>
    </form>
  </>;
}
