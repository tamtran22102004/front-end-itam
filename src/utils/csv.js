// utils/csv.js
import dayjs from "dayjs";
import { fmtDate } from "./format";
import { STATUS_MAP } from "../constants/asset";

export function exportAssetsCSV(filteredAssets, maps) {
  const {
    catMap,
    imMap,
    imManageTypeMap,
    vendorMap,
    userNameMap,
    deptNameMap,
  } = maps;

  const rows = (filteredAssets || []).map((r) => ({
    ID: r.ID,
    Name: r.Name,
    ManageCode: r.ManageCode,
    AssetCode: r.AssetCode,
    Category: catMap[r.CategoryID] || "",
    ItemMaster: imMap[r.ItemMasterID] || "",
    ManageType: imManageTypeMap[r.ItemMasterID] || "",
    Vendor: vendorMap[r.VendorID] || "",
    PurchaseDate: fmtDate(r.PurchaseDate),
    PurchasePrice: r.PurchasePrice || "",
    WarrantyStartDate: fmtDate(r.WarrantyStartDate),
    WarrantyEndDate: fmtDate(r.WarrantyEndDate),
    WarrantyMonth: r.WarrantyMonth ?? "",
    SerialNumber: r.SerialNumber || "",
    Quantity: r.Quantity ?? "",
    Status: STATUS_MAP[r.Status]?.text || r.Status,
    QRCode: r.QRCode || "",
    EmployeeID: r.EmployeeID ?? "",
    EmployeeName:
      r.EmployeeID != null ? userNameMap[String(r.EmployeeID)] || "" : "",
    SectionID: r.SectionID ?? "",
    SectionName:
      r.SectionID != null ? (deptNameMap[String(r.SectionID)] || "") : "",
    PurchaseId: r.PurchaseId || "",
  }));

  const headers = Object.keys(rows[0] || { ID: "" });
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => `"${String(row[h] ?? "").replaceAll('"', '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `assets_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
