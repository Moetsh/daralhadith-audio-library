import { Select } from "./ui";

/* قائمة اختيار التصنيف «معزولة»:
   - الرئيسية في مجموعة مستقلة «التصنيفات الرئيسية».
   - كل الفرعيات (بجميع المستويات) ضمن مجموعة «فرعيات: <الرئيسية>» لا تختلط بالرئيسية. */
export function CatSelect({
  categories = [],
  label = "التصنيف",
  required,
  emptyLabel = "— اختر التصنيف —",
  value,
  onChange,
}) {
  const parents = categories.filter((c) => !c.parent_id);
  const orphan = [];
  const byMain = new Map(parents.map((p) => [p.id, []]));

  /* اجمع كل تصنيف فرعي تحت أخيه الأعلى (الرئيسية) بغضّ النظر عن عمقه */
  for (const c of categories) {
    if (!c.parent_id) continue;
    let cur = c;
    while (cur.parent_id) {
      const up = categories.find((x) => x.id === cur.parent_id);
      if (!up) break;
      cur = up;
    }
    if (byMain.has(cur.id)) byMain.get(cur.id).push(c);
    else orphan.push(c);
  }

  /* سابقة ↳ لكل مستوى فرعي تحت الرئيسية */
  const depthLabel = (c) => {
    let lbl = c.name;
    let cur = c;
    while (cur.parent_id) {
      const up = categories.find((x) => x.id === cur.parent_id);
      if (!up) break;
      cur = up;
      lbl = "↳ " + lbl;
    }
    return lbl;
  };

  return (
    <Select required={!!required} label={label} value={value} onChange={onChange}>
      <option value="">{emptyLabel}</option>
      <optgroup label="التصنيفات الرئيسية">
        {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </optgroup>
      {parents
        .filter((p) => (byMain.get(p.id) || []).length > 0)
        .map((p) => (
          <optgroup key={p.id} label={"فرعيات: " + p.name}>
            {byMain.get(p.id).map((c) => (
              <option key={c.id} value={c.id}>{depthLabel(c)}</option>
            ))}
          </optgroup>
        ))}
      {orphan.length > 0 && (
        <optgroup label="فرعيات غير مرتبطة">
          {orphan.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      )}
    </Select>
  );
}
