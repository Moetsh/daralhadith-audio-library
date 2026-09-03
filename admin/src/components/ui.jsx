import { twMerge } from "tailwind-merge";
import { Pencil, Trash2, X } from "lucide-react";

export function cx(...parts) {
  return twMerge(parts.filter(Boolean).join(" "));
}

export function Card({ className, children }) {
  return (
    <div className={cx("rounded-2xl bg-card border border-line shadow-card", className)}>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="font-brand text-2xl md:text-3xl text-green">{title}</h1>
        {subtitle && <p className="text-ink2 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-base px-6 py-3" };
  const variants = {
    primary: "bg-green text-white hover:bg-green2 shadow-card",
    gold: "bg-gold text-white hover:bg-gold2 shadow-card",
    outline: "border border-line text-ink hover:bg-bg2",
    danger: "bg-danger text-white hover:opacity-90",
    ghost: "text-ink2 hover:bg-bg2",
  };
  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Input({ label, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-bold text-ink2 mb-1.5">{label}</span>}
      <input
        className={cx(
          "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-green2 focus:ring-2 focus:ring-green-soft",
          className
        )}
        {...props}
      />
    </label>
  );
}

export function Select({ label, className, children, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-bold text-ink2 mb-1.5">{label}</span>}
      <select
        className={cx(
          "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-green2 focus:ring-2 focus:ring-green-soft",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-bold text-ink2 mb-1.5">{label}</span>}
      <textarea
        className={cx(
          "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-green2 focus:ring-2 focus:ring-green-soft",
          className
        )}
        {...props}
      />
    </label>
  );
}

export function Badge({ tone = "green", className, children }) {
  const tones = {
    green: "bg-green-soft text-green",
    gold: "bg-gold-soft text-gold2",
    danger: "bg-red-50 text-danger",
    gray: "bg-bg2 text-ink2",
    outline: "border border-line text-ink2",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Spinner({ className }) {
  return (
    <div
      className={cx(
        "w-6 h-6 rounded-full border-2 border-green-soft border-t-green animate-spin",
        className
      )}
    />
  );
}

export function Loading({ label = "جارٍ التحميل…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ink2 gap-3">
      <Spinner className="w-8 h-8" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Empty({ text = "لا توجد بيانات بعد" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ink3 gap-2">
      <span className="text-4xl opacity-40">◈</span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 text-danger text-sm font-bold px-4 py-3">
      {error.message || String(error)}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cx("relative w-full rounded-2xl bg-card border border-line shadow-pop max-h-[90vh] flex flex-col", width)}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-brand text-xl text-green">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink3 hover:bg-bg2">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-right border-b border-line text-ink3 text-xs">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-bold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Check({ label, ...props }) {
  return (
    <label className="flex items-center gap-2 text-sm font-bold text-ink2 cursor-pointer">
      <input type="checkbox" className="accent-[#f58024] w-4 h-4" {...props} />
      {label}
    </label>
  );
}

export function RowActions({ onEdit, onDelete, editLabel = "تعديل", compact = false }) {
  if (compact) {
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" title={editLabel} onClick={onEdit}>
          <Pencil size={14} />
        </Button>
        <Button size="sm" variant="ghost" className="text-danger" title="حذف" onClick={onDelete}>
          <Trash2 size={14} />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="outline" onClick={onEdit}>
        <Pencil size={14} /> {editLabel}
      </Button>
      <Button size="sm" variant="ghost" className="text-danger" title="حذف" onClick={onDelete}>
        <Trash2 size={14} />
      </Button>
    </div>
  );
}

export function ListCard({ loading, error, empty, emptyText, className, children }) {
  return (
    <Card className={className}>
      {error && <ErrorBox error={error} />}
      {loading ? <Loading /> : empty ? <Empty text={emptyText} /> : children}
    </Card>
  );
}

export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-5">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        السابق
      </Button>
      <span className="text-sm text-ink2 font-bold">
        {page} / {pages}
      </span>
      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        التالي
      </Button>
    </div>
  );
}
