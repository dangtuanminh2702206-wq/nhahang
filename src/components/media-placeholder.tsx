type MediaPlaceholderProps = {
  label: string;
  kind?: "space" | "dish" | "combo" | "isometric" | "hero";
  className?: string;
};

export function MediaPlaceholder({ label, kind = "space", className = "" }: MediaPlaceholderProps) {
  return (
    <div className={`media-placeholder media-placeholder-${kind} ${className}`} role="img" aria-label={`Vị trí ảnh minh họa: ${label}`}>
      <span aria-hidden="true" className="media-placeholder-frame" />
      <span className="media-placeholder-label">Hình ảnh đang được hoàn thiện</span>
      <strong>{label}</strong>
    </div>
  );
}
