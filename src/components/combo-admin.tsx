"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { comboImagePaths, type ComboComponent, type ComboRecord } from "@/lib/combo-types";

const blank: ComboComponent = { label: "", quantity: null, menuCode: null };

type Feedback = {text:string;error:boolean};
function ComboEditor({ combo, menuOptions, report }: { combo?: ComboRecord; menuOptions: readonly {code:string;name:string}[]; report:(value:Feedback)=>void }) {
  const router = useRouter();
  const [components,setComponents] = useState<ComboComponent[]>(combo?.components ?? [{...blank}]);
  const [busy,setBusy] = useState(false);
  const key = combo?.id ?? "new";
  function patch(index:number,value:Partial<ComboComponent>) { setComponents(rows=>rows.map((row,i)=>i===index?{...row,...value}:row)); }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);report({text:"Đang lưu…",error:false});
    try {
      const response = await fetch("/api/admin/combos", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id:combo?.id ?? null,code:data.get("code"),name:data.get("name"),description:data.get("description"),
        guestCount:Number(data.get("guestCount")),price:Number(data.get("price")),components,imagePath:data.get("imagePath") || null,
        isActive:data.get("isActive")==="on",isAvailable:data.get("isAvailable")==="on",sortOrder:Number(data.get("sortOrder")),
        expectedVersion:combo?.version ?? null,reason:data.get("reason"),
      })});
      const result: {message?:string} = await response.json();
      report({text:response.ok?"Đã lưu combo. Lịch sử thay đổi được ghi nhận.":result.message??"Không thể lưu combo.",error:!response.ok});
      if(response.ok) { if(!combo) {form.reset();setComponents([{...blank}]);} router.refresh(); }
    } catch { report({text:"Mất kết nối. Tải lại để xác minh trước khi thử lưu tiếp.",error:true}); }
    finally {setBusy(false);}
  }
  return <section className="admin-section"><h2>{combo?.name ?? "Tạo combo"}</h2>
    <form onSubmit={submit} className="combo-editor">
      <fieldset disabled={busy}>
        <legend>{combo ? `${combo.code} · phiên bản ${combo.version}` : "Combo mới"}</legend>
        <div className="admin-form-grid">
          <label>Mã combo<input name="code" required pattern="MV-CB[0-9]{2,4}" defaultValue={combo?.code} readOnly={Boolean(combo)} /></label>
          <label>Tên combo<input name="name" required maxLength={160} defaultValue={combo?.name} /></label>
          <label>Số người gợi ý<input name="guestCount" type="number" min={1} max={100} required defaultValue={combo?.guest_count} /></label>
          <label>Giá (VND)<input name="price" type="number" min={0} max={1000000000} step={1} required defaultValue={combo?.price} /></label>
          <label>Thứ tự<input name="sortOrder" type="number" min={0} max={100000} required defaultValue={combo?.sort_order ?? 0} /></label>
          <label>Ảnh<select name="imagePath" defaultValue={combo?.image_path ?? ""}><option value="">Chưa có ảnh</option>{comboImagePaths.map(path=><option key={path} value={path}>{path.split("/").at(-1)}</option>)}</select></label>
          <label>Mô tả<textarea name="description" maxLength={500} defaultValue={combo?.description} /></label>
          <label className="checkbox-label"><input name="isActive" type="checkbox" defaultChecked={combo?.is_active ?? true} />Hiển thị public</label>
          <label className="checkbox-label"><input name="isAvailable" type="checkbox" defaultChecked={combo?.is_available ?? true} />Đang phục vụ</label>
        </div>
        <h3>Thành phần</h3><p className="small-note" id={`${key}-quantity-help`}>Để trống số lượng hoặc liên kết món khi chưa xác nhận. Mô tả cũ được giữ nguyên; đây không phải định mức nguyên liệu.</p>
        {components.map((item,index)=><div className="admin-row-form" key={index}>
          <label>Thành phần {index+1}<input value={item.label} onChange={e=>patch(index,{label:e.target.value})} required maxLength={160} /></label>
          <label>Số lượng đã xác nhận<input type="number" min={1} max={1000} value={item.quantity ?? ""} aria-describedby={`${key}-quantity-help`} onChange={e=>patch(index,{quantity:e.target.value===""?null:Number(e.target.value)})} /></label>
          <label>Món liên kết<select value={item.menuCode ?? ""} onChange={e=>patch(index,{menuCode:e.target.value || null})}><option value="">Chưa xác định</option>{menuOptions.map(row=><option key={row.code} value={row.code}>{row.code} · {row.name}</option>)}</select></label>
          <button type="button" className="button button-secondary" disabled={components.length<=1} onClick={()=>setComponents(rows=>rows.filter((_,i)=>i!==index))} aria-label={`Bỏ thành phần ${index+1}`}>Bỏ thành phần</button>
        </div>)}
        <div className="action-row"><button type="button" className="button button-secondary" disabled={components.length>=40} onClick={()=>setComponents(rows=>[...rows,{...blank}])}>Thêm thành phần</button></div>
        <label className="combo-reason">Lý do thay đổi<input name="reason" required maxLength={500} /></label>
        <button className="button button-primary" type="submit">{busy?"Đang lưu…":"Lưu combo"}</button>
      </fieldset>
    </form>
  </section>;
}

export function ComboAdmin({combos,menuOptions}:{combos:ComboRecord[];menuOptions:{code:string;name:string}[]}) {
  const [feedback,setFeedback] = useState<Feedback>({text:"",error:false});
  const status = useRef<HTMLParagraphElement>(null);
  function report(value:Feedback) {setFeedback(value);requestAnimationFrame(()=>status.current?.focus());}
  return <><p ref={status} tabIndex={-1} role={feedback.error?"alert":"status"} className="admin-message">{feedback.text}</p>{combos.map(combo=><ComboEditor key={`${combo.id}-${combo.version}`} combo={combo} menuOptions={menuOptions} report={report} />)}<ComboEditor menuOptions={menuOptions} report={report} /></>;
}
