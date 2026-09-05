import { ImageIcon, Upload } from "lucide-react";

/* تصغير صورة الغلاف إلى 1000px (JPEG بجودة 0.90) عبر canvas ثم إرجاع DataURL. */
function fileToCoverDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const MAX = 1000;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL("image/jpeg", 0.9));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذّر قراءة الصورة"));
    };
    img.src = url;
  });
}

/* منتقي غلاف الشريط: معاينة + رفع صورة + إزالة. value/onChange على cover_image_url. */
export function CoverPicker({ value, onChange }) {
  const pick = async (file) => {
    if (!file) return;
    onChange(await fileToCoverDataUrl(file));
  };

  return (
    <div>
      <label className="block text-xs font-black text-ink3 mb-1.5">غلاف الشريط (اختياري)</label>
      <div className="flex items-center gap-4">
        <div
          className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-line flex items-center justify-center"
          style={{ background: value ? "transparent" : "#f4ecd7" }}
        >
          {value ? (
            <img src={value} alt="غلاف الشريط" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={30} className="text-[#b5842e]" />
          )}
        </div>
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 rounded-xl bg-green text-white text-sm font-bold px-3.5 py-2 cursor-pointer">
            <Upload size={15} /> اختيار صورة
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </label>
          {value && (
            <div>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs font-bold text-danger hover:underline"
              >
                إزالة الغلاف
              </button>
            </div>
          )}
          <p className="text-[11px] text-ink3">تُقلَّص الصورة تلقائياً إلى 1000px بجودة عالية وتُخزّن مع الشريط.</p>
        </div>
      </div>
    </div>
  );
}
