// pages/AssetPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, message, Space } from "antd";
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import useMasterData from "../hooks/useMasterData";
import useAssetFilterMemo from "../hooks/useAssetFilterMemo";
import {
  apiAddAsset,
  apiDeleteAsset,
  apiGetAssets,
  apiUpdateAsset,
} from "../services/assetApi";
import AssetSummary from "../components/assets/AssetSummary";
import AssetFilters from "../components/assets/AssetFilters";
import AssetTable from "../components/assets/AssetTable";
import AssetFormDrawer from "../components/assets/AssetFormDrawer";
import QrPreviewModal from "../components/assets/QrPreviewModal";
import { STATUS_MAP } from "../constants/asset";
import { exportAssetsCSV } from "../utils/csv";
import dayjs from "dayjs";

export default function AssetPage() {
  const navigate = useNavigate();

  // ------- local states -------
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [currentManageType, setCurrentManageType] = useState(null);
  const [qrState, setQrState] = useState({
    open: false,
    token: null,
    assetId: null,
    title: "",
  });

  const handleShowQr = (token, record) => {
    setQrState({
      open: true,
      token,
      assetId: record?.ID,
      title: record?.Name || record?.ManageCode || `Asset#${record?.ID}`,
    });
  };
  const [filters, setFilters] = useState({
    q: "",
    category: undefined,
    itemMaster: undefined,
    vendor: undefined,
    status: undefined,
    purchaseRange: [],
    warrantyOnly: false,
    hasQROnly: false,
    manageType: undefined,
    employee: undefined,
    section: undefined,
  });

  // ------- master data -------
  const {
    loadingMasters,
    categories,
    itemMasters,
    vendors,
    users,
    sectionsList,
    // maps
    catMap,
    imMap,
    imManageTypeMap,
    vendorMap,
    userNameMap,
    deptNameMap,
    // helper
    getIMById,
  } = useMasterData();

  // ------- fetch assets -------
  const fetchAssets = async () => {
    try {
      setLoadingAssets(true);
      setAssets(await apiGetAssets());
    } catch (e) {
      console.error(e);
      message.error("Không thể tải danh sách tài sản");
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // ------- filtered + stats -------
  const { filteredAssets, byStatus, warrantyActiveCount, withQRCount } =
    useAssetFilterMemo(assets, filters, imManageTypeMap);

  const total = filteredAssets.length;

  // ------- table actions -------
  const onView = (record) => navigate(`/assetdetail/${record.ID}`);
  const onEdit = (record) => {
    setEditingAsset(record);
    const im = getIMById(record.ItemMasterID);
    setCurrentManageType(im?.ManageType || null);
    setOpenModal(true);
  };
  const onDelete = async (id) => {
    try {
      await apiDeleteAsset(id);
      message.success("Xóa tài sản thành công!");
      fetchAssets();
    } catch {
      message.error("Không thể xóa tài sản");
    }
  };

  // ------- modal submit -------
  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        PurchaseDate: values.PurchaseDate
          ? dayjs(values.PurchaseDate).format("YYYY-MM-DD")
          : null,
        WarrantyStartDate: values.WarrantyStartDate
          ? dayjs(values.WarrantyStartDate).format("YYYY-MM-DD")
          : null,
        WarrantyEndDate: values.WarrantyEndDate
          ? dayjs(values.WarrantyEndDate).format("YYYY-MM-DD")
          : null,
      };
      if (editingAsset) {
        await apiUpdateAsset(editingAsset.ID, payload);
        message.success("Cập nhật Asset thành công!");
      } else {
        await apiAddAsset(payload);
        message.success("Thêm Asset thành công!");
      }
      setOpenModal(false);
      setCurrentManageType(null);
      setEditingAsset(null);
      fetchAssets();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Lỗi khi lưu Asset");
    }
  };

  const STATUS_OPTIONS = useMemo(
    () =>
      Object.entries(STATUS_MAP).map(([k, v]) => ({
        value: Number(k),
        label: v.text,
      })),
    []
  );

  return (
    <div>
      <Card
        title={
          <Space>
            Quản lý Tài sản (Asset)
            <Badge
              count={filteredAssets.length}
              style={{ backgroundColor: "#1677ff" }}
              title="Số bản ghi sau lọc"
            />
          </Space>
        }
        extra={
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAssets}
              loading={loadingAssets || loadingMasters}
            >
              Làm mới
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                exportAssetsCSV(filteredAssets, {
                  catMap,
                  imMap,
                  imManageTypeMap,
                  vendorMap,
                  userNameMap,
                  deptNameMap,
                })
              }
            >
              Xuất CSV (lọc)
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingAsset(null);
                setCurrentManageType(null);
                setOpenModal(true);
              }}
            >
              Thêm mới
            </Button>
          </Space>
        }
        bodyStyle={{ padding: 14 }}
        style={{ borderRadius: 10, marginBottom: 12 }}
      >
        {/* Summary */}
        <AssetSummary
          total={total}
          byStatus={byStatus}
          warrantyActiveCount={warrantyActiveCount}
          withQRCount={withQRCount}
        />

        {/* Filters */}
        <AssetFilters
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          itemMasters={itemMasters}
          vendors={vendors}
          users={users}
          sectionsList={sectionsList}
        />

        {/* Table */}
        <AssetTable
          data={filteredAssets}
          loading={loadingAssets || loadingMasters}
          catMap={catMap}
          imMap={imMap}
          imManageTypeMap={imManageTypeMap}
          vendorMap={vendorMap}
          userNameMap={userNameMap}
          deptNameMap={deptNameMap}
          onShowQr={handleShowQr}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />

        {/* Modal */}
        <AssetFormDrawer
          open={openModal}
          onCancel={() => {
            setOpenModal(false);
            setCurrentManageType(null);
            setEditingAsset(null);
          }}
          onSubmit={onSubmit}
          editingAsset={editingAsset}
          categories={categories}
          itemMasters={itemMasters}
          vendors={vendors}
          getIMById={getIMById}
          currentManageType={currentManageType}
          setCurrentManageType={setCurrentManageType}
          STATUS_OPTIONS={STATUS_OPTIONS}
        />
        <QrPreviewModal
          open={qrState.open}
          token={qrState.token}
          title={qrState.title}
          assetId={qrState.assetId}

          onClose={() => setQrState({ open: false, token: null, title: "" })}
          size={512}
        />
      </Card>
    </div>
  );
}
