// src/hooks/useHistoryFilterMemo.js
import { useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

export default function useHistoryFilterMemo(rows, filters, TYPE_MAP) {
  const filtered = useMemo(() => {
    let list = rows.slice();

    const q = (filters.q || "").trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [
          r.AssetName,
          r.AssetID,
          r.FromEmployeeName,
          r.FromDepartmentName,
          r.ToEmployeeName,
          r.ToDepartmentName,
          r.Note,
          String(r.RequestID || ""),
        ]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      );
    }

    if (filters.type) {
      list = list.filter(
        (r) =>
          String(r.Type).toUpperCase() === String(filters.type).toUpperCase()
      );
    }

    if (filters.reqType) {
      list = list.filter((r) => (r.RequestTypeName || "") === filters.reqType);
    }

    if (Array.isArray(filters.range) && filters.range.length === 2) {
      const [start, end] = filters.range;
      if (start && end) {
        list = list.filter((r) => {
          const d = dayjs(r.ActionAt);
          return (
            d.isValid() &&
            d.isBetween(start.startOf("day"), end.endOf("day"), null, "[]")
          );
        });
      }
    }

    // sort mới → cũ
    list.sort(
      (a, b) => dayjs(b.ActionAt).valueOf() - dayjs(a.ActionAt).valueOf()
    );
    return list;
  }, [rows, filters]);

  const distinctAssetCount = useMemo(
    () => new Set(rows.map((r) => r.AssetID)).size,
    [rows]
  );

  const requestTypeOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.RequestTypeName).filter(Boolean));
    return Array.from(set);
  }, [rows]);

  const byType = useMemo(() => {
    const acc = {};
    Object.keys(TYPE_MAP).forEach((k) => (acc[k] = 0));
    filtered.forEach((r) => {
      const key = String(r.Type || "").toUpperCase();
      if (!acc[key]) acc[key] = 0;
      acc[key] += 1;
    });
    return acc;
  }, [filtered, TYPE_MAP]);

  return { filtered, distinctAssetCount, requestTypeOptions, byType };
}
