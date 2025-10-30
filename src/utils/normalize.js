// utils/normalize.js
export const normalizeUser = (u) => {
  const id =
    u?.ID ?? u?.Id ?? u?.id ?? u?.UserID ?? u?.userId ?? u?.user_id ?? null;
  const name =
    u?.FullName ??
    u?.fullName ??
    u?.Name ??
    u?.name ??
    ([u?.FirstName ?? u?.firstName, u?.LastName ?? u?.lastName]
      .filter(Boolean)
      .join(" ") || (id != null ? `User#${id}` : ""));
  return { id: id != null ? String(id) : null, name };
};

export const normalizeDepartment = (d) => {
  const id =
    d?.ID ?? d?.Id ?? d?.id ?? d?.DepartmentID ?? d?.departmentId ?? null;
  const name =
    d?.Name ?? d?.name ?? d?.DepartmentName ?? d?.departmentName ??
    (id != null ? `Dept#${id}` : "");
  return { id: id != null ? String(id) : null, name };
};
