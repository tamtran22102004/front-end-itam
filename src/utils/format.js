// utils/format.js
import dayjs from "dayjs";

export const fmtMoney = (v) =>
  typeof v === "number"
    ? v.toLocaleString("vi-VN")
    : v
    ? Number(v)?.toLocaleString("vi-VN")
    : "—";

export const fmtDate = (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—");

export const isWarrantyActive = (start, end) => {
  if (!start || !end) return false;
  const s = dayjs(start);
  const e = dayjs(end);
  const now = dayjs();
  return (
    (now.isAfter(s, "day") && now.isBefore(e, "day")) ||
    now.isSame(s, "day") ||
    now.isSame(e, "day")
  );
};
export const fmtDateTime = (v, fmt = "YYYY-MM-DD HH:mm:ss") =>
  v ? dayjs(v).format(fmt) : "—";
