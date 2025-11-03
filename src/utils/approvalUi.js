import { Tag } from "antd";
import React from "react"; // nếu cần

export const fmt = (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "");

export const stateTag = (st) => {
  const color =
    st === "PENDING"
      ? "gold"
      : st?.startsWith("IN_PROGRESS")
      ? "blue"
      : st === "APPROVED"
      ? "green"
      : st === "REJECTED"
      ? "red"
      : "default";

  // ✅ Dùng React.createElement thay vì JSX
  return React.createElement(Tag, { color }, st || "-");
};

export const canApproveByRole = (state, role) => {
  const r = String(role || "").toUpperCase();
  if ((state === "PENDING" || state === "IN_PROGRESS_STEP_1") && r === "IT")
    return true;
  if (state?.startsWith("IN_PROGRESS_STEP_2") && r === "MANAGER")
    return true;
  return false;
};
