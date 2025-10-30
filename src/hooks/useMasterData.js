// hooks/useMasterData.js
import { useEffect, useMemo, useState } from "react";
import {
  apiGetCategories,
  apiGetItemMasters,
  apiGetVendors,
  apiGetUsers,
  apiGetDepartments,
} from "../services/assetApi";
import { normalizeUser, normalizeDepartment } from "../utils/normalize";
import { message } from "antd";

export default function useMasterData() {
  const [categories, setCategories] = useState([]);
  const [itemMasters, setItemMasters] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingMasters(true);
        const [
          _categories,
          _itemMasters,
          _vendors,
          _usersRaw,
          _departmentsRaw,
        ] = await Promise.all([
          apiGetCategories(),
          apiGetItemMasters(),
          apiGetVendors(),
          apiGetUsers(),
          apiGetDepartments(),
        ]);
        setCategories(_categories);
        setItemMasters(_itemMasters);
        setVendors(_vendors);
        setUsers(_usersRaw.map(normalizeUser).filter((u) => u.id));
        setDepartments(
          _departmentsRaw.map(normalizeDepartment).filter((d) => d.id)
        );
      } catch (e) {
        console.error(e);
        message.error("Không thể tải dữ liệu danh mục/master");
      } finally {
        setLoadingMasters(false);
      }
    };
    load();
  }, []);

  // Lookup maps
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.ID, c.Name])),
    [categories]
  );
  const imMap = useMemo(
    () => Object.fromEntries(itemMasters.map((i) => [i.ID, i.Name])),
    [itemMasters]
  );
  const imManageTypeMap = useMemo(
    () => Object.fromEntries(itemMasters.map((i) => [i.ID, i.ManageType])),
    [itemMasters]
  );
  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.ID, v.Name])),
    [vendors]
  );
  const userNameMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.name])),
    [users]
  );
  const deptNameMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments]
  );
  const sectionsList = useMemo(
    () => departments.map((d) => ({ id: d.id, name: d.name })),
    [departments]
  );

  const getIMById = (id) => itemMasters.find((i) => i.ID === id);

  return {
    loadingMasters,
    categories,
    itemMasters,
    vendors,
    users,
    departments,
    // maps
    catMap,
    imMap,
    imManageTypeMap,
    vendorMap,
    userNameMap,
    deptNameMap,
    sectionsList,
    // helpers
    getIMById,
  };
}
