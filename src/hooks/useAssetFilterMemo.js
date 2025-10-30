// hooks/useAssetFilterMemo.js
import { useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { isWarrantyActive } from "../utils/format";

dayjs.extend(isBetween);

export default function useAssetFilterMemo(assets, filters, imManageTypeMap) {
  const filteredAssets = useMemo(() => {
    let list = assets || [];

    if (filters.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter(
        (it) =>
          (it.Name || "").toLowerCase().includes(q) ||
          (it.ManageCode || "").toLowerCase().includes(q) ||
          (it.AssetCode || "").toLowerCase().includes(q) ||
          (it.SerialNumber || "").toLowerCase().includes(q)
      );
    }

    if (filters.category) list = list.filter((it) => it.CategoryID === filters.category);
    if (filters.itemMaster) list = list.filter((it) => it.ItemMasterID === filters.itemMaster);
    if (filters.vendor) list = list.filter((it) => it.VendorID === filters.vendor);

    if (filters.manageType) {
      list = list.filter(
        (it) => (imManageTypeMap[it.ItemMasterID] || null) === filters.manageType
      );
    }

    if (filters.employee)
      list = list.filter(
        (it) => String(it.EmployeeID ?? "") === String(filters.employee)
      );

    if (filters.section)
      list = list.filter(
        (it) => String(it.SectionID ?? "") === String(filters.section)
      );

    if (filters.status !== undefined && filters.status !== null)
      list = list.filter((it) => Number(it.Status) === Number(filters.status));

    if (filters.warrantyOnly)
      list = list.filter((it) =>
        isWarrantyActive(it.WarrantyStartDate, it.WarrantyEndDate)
      );

    if (filters.hasQROnly) list = list.filter((it) => !!it.QRCode);

    if (Array.isArray(filters.purchaseRange) && filters.purchaseRange.length === 2) {
      const [start, end] = filters.purchaseRange;
      if (start && end) {
        list = list.filter((it) => {
          if (!it.PurchaseDate) return false;
          const d = dayjs(it.PurchaseDate);
          return d.isValid() && d.isBetween(start.startOf("day"), end.endOf("day"), null, "[]");
        });
      }
    }

    return list;
  }, [assets, filters, imManageTypeMap]);

  const byStatus = useMemo(() => {
    const m = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    filteredAssets.forEach((a) => (m[a.Status] = (m[a.Status] || 0) + 1));
    return m;
  }, [filteredAssets]);

  const warrantyActiveCount = useMemo(
    () => filteredAssets.filter((a) => isWarrantyActive(a.WarrantyStartDate, a.WarrantyEndDate)).length,
    [filteredAssets]
  );

  const withQRCount = useMemo(
    () => filteredAssets.filter((a) => !!a.QRCode).length,
    [filteredAssets]
  );

  return {
    filteredAssets,
    byStatus,
    warrantyActiveCount,
    withQRCount,
  };
}
