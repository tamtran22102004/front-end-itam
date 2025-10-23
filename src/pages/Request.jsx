// src/pages/RequestCreatePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card, Form, Input, InputNumber, Select, Button, Space, Tag, message, Tooltip,
  Typography, Divider, Descriptions, Alert, Spin, Badge, Progress, List
} from "antd";
import {
  SendOutlined, RedoOutlined, ReloadOutlined, InfoCircleOutlined,
  DatabaseOutlined, ToolOutlined, DeleteOutlined, SafetyOutlined, QrcodeOutlined
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

const API_URL = import.meta.env.VITE_BACKEND_URL;
const CREATE_BASE       = `${API_URL}/api/request/createrequest`;
const ASSET_LIST_BASE   = `${API_URL}/api/asset`;
const ASSET_DETAIL_BASE = `${API_URL}/api/asset/assetdetail`; // + /:id

const REQUEST_TYPES = [
  { value: "ALLOCATION", label: (<><DatabaseOutlined /> Allocation (Cấp phát)</>) },
  { value: "MAINTENANCE", label: (<><ToolOutlined /> Maintenance (Bảo trì)</>) },
  { value: "DISPOSAL",    label: (<><DeleteOutlined /> Disposal (Thanh lý)</>) },
  { value: "WARRANTY",    label: (<><SafetyOutlined /> Warranty (Bảo hành)</>) },
];

const getToken = () => localStorage.getItem("token") || "";
const withAuth = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const normalizeUser = (u) => !u ? null : ({
  UserID: u.UserID ?? u.userID ?? u.userId ?? u.id ?? null,
  DepartmentID: u.DepartmentID ?? u.departmentID ?? u.departmentId ?? u.deptId ?? null,
  Role: String(u.Role ?? u.role ?? "").toUpperCase() || null,
  FullName: u.FullName ?? u.fullname ?? u.fullName ?? u.name ?? "",
  Email: u.Email ?? u.email ?? "",
});

// ===== Asset helpers
const STATUS = { AVAILABLE:1, ALLOCATED:2, MAINTENANCE_OUT:3, WARRANTY_OUT:4, DISPOSED:5 };
const STATUS_LABEL = {
  [STATUS.AVAILABLE]:"AVAILABLE",
  [STATUS.ALLOCATED]:"ALLOCATED",
  [STATUS.MAINTENANCE_OUT]:"MAINTENANCE_OUT",
  [STATUS.WARRANTY_OUT]:"WARRANTY_OUT",
  [STATUS.DISPOSED]:"DISPOSED",
};
const STATUS_COLOR = {
  [STATUS.AVAILABLE]:"green",
  [STATUS.ALLOCATED]:"blue",
  [STATUS.MAINTENANCE_OUT]:"orange",
  [STATUS.WARRANTY_OUT]:"gold",
  [STATUS.DISPOSED]:"red",
};

const fmtDate  = (v) => (v ? String(v).replace("T"," ").slice(0,19) : "-");
const fmtMoney = (n) => (n == null ? "-" : Number(n).toLocaleString("vi-VN"));
const isWarrantyActive = (start, end) => {
  if (!start || !end) return false;
  const now = new Date();
  return now >= new Date(start) && now <= new Date(end);
};

const allowedByTypeLite = (type, status) => {
  const s = Number(status);
  switch (type) {
    case "ALLOCATION":  return s === STATUS.AVAILABLE;
    case "MAINTENANCE": return ![STATUS.DISPOSED, STATUS.MAINTENANCE_OUT, STATUS.WARRANTY_OUT].includes(s);
    case "WARRANTY":    return s !== STATUS.DISPOSED;
    case "DISPOSAL":    return ![STATUS.DISPOSED, STATUS.ALLOCATED, STATUS.MAINTENANCE_OUT, STATUS.WARRANTY_OUT].includes(s);
    default:            return true;
  }
};

// strict reason (string nếu vi phạm; null nếu hợp lệ)
const disallowReasonByType = (type, status, assetDetailAsset) => {
  const s = Number(status);
  const hasOpen = !!(assetDetailAsset?.HasOpenRequest || (assetDetailAsset?.OpenRequestCount > 0));
  if (hasOpen) return "Tài sản đang có yêu cầu mở khác.";
  switch (type) {
    case "ALLOCATION":
      if (s !== STATUS.AVAILABLE) return "Cấp phát chỉ áp dụng cho thiết bị AVAILABLE.";
      return null;
    case "MAINTENANCE":
      if ([STATUS.DISPOSED, STATUS.MAINTENANCE_OUT, STATUS.WARRANTY_OUT].includes(s)) return "Thiết bị không hợp lệ cho bảo trì.";
      if (isWarrantyActive(assetDetailAsset?.WarrantyStartDate, assetDetailAsset?.WarrantyEndDate)) return "Thiết bị còn hạn bảo hành — hãy tạo WARRANTY.";
      return null;
    case "WARRANTY":
      if ([STATUS.DISPOSED, STATUS.WARRANTY_OUT].includes(s)) return "Thiết bị không hợp lệ cho bảo hành.";
      if (!isWarrantyActive(assetDetailAsset?.WarrantyStartDate, assetDetailAsset?.WarrantyEndDate)) return "Thiết bị hết/không có bảo hành.";
      return null;
    case "DISPOSAL":
      if (s === STATUS.DISPOSED) return "Thiết bị đã thanh lý.";
      if ([STATUS.ALLOCATED, STATUS.MAINTENANCE_OUT, STATUS.WARRANTY_OUT].includes(s)) return "Cần thu hồi/hoàn tất trước khi thanh lý.";
      return null;
    default:
      return "Loại yêu cầu không hỗ trợ.";
  }
};

const extractAssets = (resp) => {
  const d = resp?.data;
  if (Array.isArray(d?.assets)) return d.assets;
  if (Array.isArray(d?.data))   return d.data;
  if (Array.isArray(d))         return d;
  return [];
};
const normListItem = (a) => ({
  ID: a.ID ?? a.id ?? a.AssetID ?? a.assetId,
  Name: a.Name ?? a.name ?? "",
  ManageCode: a.ManageCode ?? a.manageCode ?? "",
  AssetCode: a.AssetCode ?? a.assetCode ?? "",
  SerialNumber: a.SerialNumber ?? a.serialNumber ?? "",
  Status: Number(a.Status ?? a.status ?? 0),
  Quantity: Number(a.Quantity ?? a.quantity ?? 1),
});
const normDetail = (resp) => {
  const root = resp?.data?.data || resp?.data || resp || {};
  const asset = root.asset || {};
  const attrs = Array.isArray(root.attributes) ? root.attributes : [];
  return {
    asset: {
      ID: asset.ID, ManageCode: asset.ManageCode, AssetCode: asset.AssetCode, Name: asset.Name,
      SerialNumber: asset.SerialNumber, CategoryID: asset.CategoryID, CategoryName: asset.CategoryName,
      ItemMasterID: asset.ItemMasterID, ItemMasterName: asset.ItemMasterName,
      VendorID: asset.VendorID, VendorName: asset.VendorName,
      PurchaseDate: asset.PurchaseDate, PurchasePrice: asset.PurchasePrice, PurchaseId: asset.PurchaseId,
      WarrantyStartDate: asset.WarrantyStartDate, WarrantyEndDate: asset.WarrantyEndDate, WarrantyMonth: asset.WarrantyMonth,
      EmployeeID: asset.EmployeeID, EmployeeName: asset.EmployeeName,
      SectionID: asset.SectionID, DepartmentName: asset.DepartmentName,
      Quantity: Number(asset.Quantity ?? 1),
      QRCode: asset.QRCode,
      Status: Number(asset.Status ?? 0),
      HasOpenRequest: asset.HasOpenRequest ?? false,
      OpenRequestCount: asset.OpenRequestCount ?? 0,
    },
    attributes: attrs.map(x => ({ ID:x.ID, AttributeID:x.AttributeID, Name:x.Name, Unit:x.Unit, Value:x.Value })),
  };
};
const shortId = (id) => (id ? `${String(id).slice(0,8)}…${String(id).slice(-4)}` : "-");
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const warrantyInfo = (start, end) => {
  if (!start || !end) return { active:false, percent:0, daysLeft:0, totalDays:0 };
  const s = new Date(start), e = new Date(end), now = new Date();
  const total = Math.max(1, Math.round((e - s) / (1000*60*60*24)));
  const passed = Math.round((now - s) / (1000*60*60*24));
  const left = Math.max(0, Math.round((e - now) / (1000*60*60*24)));
  return {
    active: now >= s && now <= e,
    percent: clamp(Math.round((passed / total) * 100), 0, 100),
    daysLeft: left,
    totalDays: total,
  };
};

export default function RequestCreatePage() {
  const [form] = Form.useForm();
  const [currentUser, setCurrentUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetDetail, setAssetDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const type = Form.useWatch("type", form);
  const selectedAssetId = Form.useWatch("AssetID", form);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw && raw !== "undefined") setCurrentUser(normalizeUser(JSON.parse(raw)));
    } catch {}
  }, []);

  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      const resp = await axios.get(ASSET_LIST_BASE, withAuth());
      setAssets(extractAssets(resp).map(normListItem).filter(x => x.ID));
    } catch (e) {
      message.error(e?.response?.data?.message || "Không tải được danh sách thiết bị");
    } finally {
      setLoadingAssets(false);
    }
  };
  useEffect(() => { fetchAssets(); }, []);

  const fetchDetail = async (id) => {
    if (!id) { setAssetDetail(null); return null; }
    setLoadingDetail(true);
    try {
      const resp = await axios.get(`${ASSET_DETAIL_BASE}/${id}`, withAuth());
      const detail = normDetail(resp);
      setAssetDetail(detail);
      return detail;
    } catch (e) {
      setAssetDetail(null);
      message.warning("Không tải được chi tiết thiết bị.");
      return null;
    } finally {
      setLoadingDetail(false);
    }
  };

  // khi chọn asset → fetch detail và kiểm tra strict
  useEffect(() => {
    (async () => {
      if (!selectedAssetId) { setAssetDetail(null); return; }
      const detail = await fetchDetail(selectedAssetId);
      if (!detail) return;
      const lite = assets.find(x => x.ID === selectedAssetId);
      const reason = disallowReasonByType(form.getFieldValue("type"), lite?.Status, detail.asset);
      if (reason) {
        form.setFieldValue("AssetID", undefined);
        setAssetDetail(null);
        message.error(reason);
        return;
      }
      // clamp số lượng theo tồn của asset mỗi lần đổi Asset
      if (form.getFieldValue("type") === "ALLOCATION") {
        const maxQty = Number(detail.asset.Quantity || lite?.Quantity || 1) || 1;
        const cur = Number(form.getFieldValue("Quantity") || 1);
        form.setFieldValue("Quantity", Math.min(Math.max(cur, 1), maxQty));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssetId]);

  // đổi loại → re-validate asset + clamp qty
  useEffect(() => {
    if (!type || !assetDetail?.asset?.ID) return;
    const lite = assets.find(x => x.ID === assetDetail.asset.ID);
    const reason = disallowReasonByType(type, lite?.Status, assetDetail.asset);
    if (reason) {
      form.setFieldValue("AssetID", undefined);
      setAssetDetail(null);
      message.info("Loại yêu cầu thay đổi: " + reason);
      return;
    }
    if (type === "ALLOCATION") {
      const maxQty = Number(assetDetail.asset.Quantity || lite?.Quantity || 1) || 1;
      const cur = Number(form.getFieldValue("Quantity") || 1);
      form.setFieldValue("Quantity", Math.min(Math.max(cur, 1), maxQty));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // ===== options Select: label (dropdown) khác display (để ô đã chọn không tràn)
  const assetOptions = useMemo(() => {
    return assets.map(a => {
      const primary = a.ManageCode || a.AssetCode || a.SerialNumber || a.ID;
      const sub = a.Name || "(Không tên)";
      const display = `${primary}${a.SerialNumber ? ` • SN: ${a.SerialNumber}` : ""}`; // hiển thị ngắn trong ô chọn

      const label = (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:380 }}>
              {primary}
            </div>
            <div style={{ color:"#666", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:380 }}>
              {sub}{a.SerialNumber ? ` • SN: ${a.SerialNumber}` : ""}
            </div>
          </div>
          <div style={{ marginLeft:"auto" }}>
            <Tag color={STATUS_COLOR[a.Status] || "default"}>{STATUS_LABEL[a.Status] || a.Status}</Tag>
          </div>
        </div>
      );
      return {
        value: a.ID,
        label,                   // dùng trong dropdown
        display,                 // dùng trong ô đã chọn (ngắn gọn)
        disabled: !allowedByTypeLite(form.getFieldValue("type"), a.Status),
        searchKey: `${a.ManageCode} ${a.AssetCode} ${a.SerialNumber} ${a.Name} ${STATUS_LABEL[a.Status] || a.Status}`.toLowerCase(),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, type]);

  const selectedFromList = useMemo(
    () => assets.find(x => x.ID === selectedAssetId),
    [assets, selectedAssetId]
  );

  const onFinish = async (values) => {
    if (!currentUser?.UserID) return message.error("Không xác định người tạo yêu cầu.");

    // đảm bảo có detail & validate lần cuối
    let detail = assetDetail;
    if (!detail || detail?.asset?.ID !== values.AssetID) {
      detail = await fetchDetail(values.AssetID);
      if (!detail) return;
    }
    const lite = assets.find(x => x.ID === values.AssetID);
    const reason = disallowReasonByType(values.type, lite?.Status, detail.asset);
    if (reason) return message.error(reason);

    // clamp Quantity theo tồn
    let qty = 1;
    if (values.type === "ALLOCATION") {
      const maxQty = Number(detail.asset.Quantity || lite?.Quantity || 1) || 1;
      qty = Math.min(Math.max(Number(values.Quantity || 1), 1), maxQty);
    }

    const payload = {
      typeCode: values.type,
      RequesterUserID: currentUser.UserID,
      Note: values.Note || null,
      AssetID: values.AssetID,
      Quantity: qty,
      IssueDescription: values.IssueDescription,
      Reason: values.Reason,
      WarrantyProvider: values.WarrantyProvider,
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    setSubmitting(true);
    try {
      const resp = await axios.post(CREATE_BASE, payload, withAuth());
      const rid = resp?.data?.data?.RequestID;
      message.success(resp?.data?.message || "Tạo yêu cầu thành công");
      if (rid) message.info(`RequestID: ${rid}`);
      form.resetFields(["AssetID","Quantity","IssueDescription","Reason","WarrantyProvider","Note"]);
      setAssetDetail(null);
    } catch (e) {
      message.error(e?.response?.data?.message || "Không tạo được yêu cầu");
    } finally {
      setSubmitting(false);
    }
  };

  // ====== UI ======
  const maxQty =
    type === "ALLOCATION"
      ? Number(assetDetail?.asset?.Quantity || selectedFromList?.Quantity || 1) || 1
      : undefined;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* HEADER */}
      <Card size="small" bodyStyle={{ padding:10 }} style={{ borderRadius:10, marginBottom:12 }}>
        <Space wrap>
          <Title level={5} style={{ margin:0 }}>Tạo yêu cầu</Title>
          <Divider type="vertical" />
          <Tag>Người tạo: <b>{currentUser?.FullName || currentUser?.Email || currentUser?.UserID || "-"}</b></Tag>
          <Tag>Role: <b>{currentUser?.Role || "-"}</b></Tag>
          <Tooltip title="Tải lại danh sách thiết bị">
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchAssets} loading={loadingAssets}>
              Reload assets
            </Button>
          </Tooltip>
        </Space>
      </Card>

      {/* FORM (compact) */}
      <Card size="small" style={{ borderRadius:10 }} bodyStyle={{ padding:14 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom:10 }}
          message={<Space size={6}><InfoCircleOutlined /><span>Chọn Asset từ danh sách. FE lọc theo trạng thái; khi chọn sẽ kiểm tra thêm bảo hành & request mở.</span></Space>}
        />

        <Form
          form={form}
          size="small"
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ type:"ALLOCATION", Quantity:1 }}
          onValuesChange={(changed) => {
            if ("Quantity" in changed && type === "ALLOCATION") {
              const v = Number(changed.Quantity || 1);
              const clamped = Math.min(Math.max(v, 1), Number(maxQty || 1));
              if (clamped !== v) form.setFieldValue("Quantity", clamped);
            }
          }}
        >
          <div style={{ display:"grid", gap:10, gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" }}>
            <Form.Item
              name="type"
              label="Loại yêu cầu"
              rules={[{ required:true, message:"Chọn loại yêu cầu" }]}
              style={{ marginBottom:6 }}
            >
              <Select options={REQUEST_TYPES} />
            </Form.Item>

            <Form.Item
              name="AssetID"
              label="Thiết bị (Asset)"
              rules={[{ required:true, message:"Chọn thiết bị" }]}
              tooltip="Gõ mã quản lý / mã tài sản / serial / tên để tìm nhanh"
              style={{ marginBottom:6 }}
            >
              <Select
                showSearch
                placeholder="Tìm & chọn thiết bị…"
                loading={loadingAssets}
                options={assetOptions}
                optionLabelProp="display"              // hiển thị ngắn gọn trong ô đã chọn -> không tràn
                filterOption={(input, option) => (option?.searchKey || "").includes(input.toLowerCase())}
                dropdownMatchSelectWidth={520}
                allowClear
              />
            </Form.Item>
          </div>

          {/* Quantity: ALLOCATION, <= asset.Quantity */}
          {form.getFieldValue("type") === "ALLOCATION" && (
            <Form.Item
              name="Quantity"
              label={`Số lượng (tối đa ${maxQty ?? 1})`}
              rules={[
                { required:true, message:"Nhập số lượng" },
                ({ getFieldValue }) => ({
                  validator(_, v){
                    const val = Number(v || 0);
                    const mx = Number(maxQty || 1);
                    if (!val || val < 1) return Promise.reject(new Error("Số lượng ≥ 1"));
                    if (val > mx) return Promise.reject(new Error(`Không vượt quá số lượng tồn (${mx})`));
                    return Promise.resolve();
                  }
                })
              ]}
              style={{ width: 220 }}
            >
              <InputNumber min={1} max={maxQty || 1} style={{ width:"100%" }} />
            </Form.Item>
          )}

          {/* Conditional fields */}
          <Form.Item
            name="IssueDescription"
            label="Mô tả sự cố"
            hidden={form.getFieldValue("type") !== "MAINTENANCE"}
            rules={form.getFieldValue("type") === "MAINTENANCE"
              ? [{ required:true, validator:(_,v)=> (v && String(v).trim().length>=5) ? Promise.resolve() : Promise.reject(new Error("Nhập mô tả sự cố (≥ 5 ký tự)")) }]
              : []}
          >
            <Input.TextArea rows={3} maxLength={500} placeholder="VD: Máy nóng, quạt kêu lớn..." />
          </Form.Item>

          <Form.Item
            name="Reason"
            label="Lý do thanh lý"
            hidden={form.getFieldValue("type") !== "DISPOSAL"}
            rules={form.getFieldValue("type") === "DISPOSAL"
              ? [{ required:true, validator:(_,v)=> (v && String(v).trim().length>=3) ? Promise.resolve() : Promise.reject(new Error("Nhập lý do thanh lý (≥ 3 ký tự)")) }]
              : []}
          >
            <Input.TextArea rows={3} maxLength={500} placeholder="VD: Không còn sử dụng..." />
          </Form.Item>

          <Form.Item
            name="WarrantyProvider"
            label="Đơn vị bảo hành"
            hidden={form.getFieldValue("type") !== "WARRANTY"}
            rules={form.getFieldValue("type") === "WARRANTY"
              ? [{ required:true, message:"Nhập đơn vị bảo hành" }]
              : []}
          >
            <Input placeholder="VD: TT Bảo hành ABC" />
          </Form.Item>

          <Form.Item name="Note" label="Ghi chú">
            <Input.TextArea rows={3} maxLength={500} placeholder="Ghi chú thêm (tuỳ chọn)" />
          </Form.Item>

          <Divider style={{ margin:"8px 0 10px" }} />

          <Space>
            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={submitting} disabled={!currentUser}>
              Gửi yêu cầu
            </Button>
            <Button htmlType="button" icon={<RedoOutlined />} onClick={() => { form.resetFields(); setAssetDetail(null); }}>
              Xoá form
            </Button>
          </Space>
        </Form>
      </Card>

      {/* ASSET DETAIL (đẹp, dễ đọc) */}
<Card
  size="small"
  title="Thông tin thiết bị"
  style={{ borderRadius:10, marginTop:12 }}
  bodyStyle={{ padding:14 }}
  extra={
    <Space>
      <Tag color={STATUS_COLOR[(assetDetail?.asset?.Status ?? selectedFromList?.Status) || "default"] || "default"}>
        {STATUS_LABEL[(assetDetail?.asset?.Status ?? selectedFromList?.Status)] || "-"}
      </Tag>
      <Badge count={assetDetail?.attributes?.length || 0} title="Số thuộc tính kỹ thuật" />
    </Space>
  }
>
  <Spin spinning={loadingDetail}>
    {!selectedAssetId ? (
      <Alert type="info" showIcon message="Chưa chọn thiết bị" description="Hãy chọn một thiết bị ở form phía trên để xem chi tiết." />
    ) : (
      (() => {
        const a = assetDetail?.asset || {};
        const name = a.Name || selectedFromList?.Name || "-";
        const manage = a.ManageCode || selectedFromList?.ManageCode || a.AssetCode || selectedFromList?.AssetCode || "-";
        const serial = a.SerialNumber || selectedFromList?.SerialNumber || "-";
        const qty = a.Quantity ?? selectedFromList?.Quantity ?? "-";
        const cat = a.CategoryName || "-";
        const model = a.ItemMasterName || "-";
        const vendor = a.VendorName || "-";
        const w = warrantyInfo(a.WarrantyStartDate, a.WarrantyEndDate);

        return (
          <div style={{ display:"grid", gap:12 }}>
            {/* Header */}
            <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
              <Title level={5} style={{ margin:0 }}>{name}</Title>
              <Space wrap size={6} style={{ color:"#666" }}>
                <Tag>{`Mã: ${manage}`}</Tag>
                <Tag>{`Serial: ${serial}`}</Tag>
                {a.QRCode ? <Tag icon={<QrcodeOutlined />}>{a.QRCode}</Tag> : null}
              </Space>
              <div style={{ marginLeft:"auto" }}>
                <Text type="secondary">ID:&nbsp;</Text>
                <Text code copyable={{ text: a.ID || selectedAssetId }}>
                  {shortId(a.ID || selectedAssetId)}
                </Text>
              </div>
            </div>

            {/* Meta chips */}
            <Space wrap>
              <Tag color="processing">Loại: {cat}</Tag>
              <Tag color="geekblue">Model: {model}</Tag>
              <Tag color="purple">Vendor: {vendor}</Tag>
              <Tag color="gold">Tồn: {qty}</Tag>
              {(a.HasOpenRequest || a.OpenRequestCount > 0) && <Tag color="orange">Có yêu cầu đang mở</Tag>}
            </Space>

            <Divider style={{ margin:"8px 0" }} />

            {/* 2 cột chính */}
            <div
              style={{
                display:"grid",
                gridTemplateColumns:"1fr 1fr",
                gap:12,
              }}
            >
              {/* Cột trái */}
              <Card size="small" bordered={true} bodyStyle={{ padding:12 }}>
                <Title level={5} style={{ marginTop:0 }}>Mua hàng</Title>
                <div style={{ lineHeight:1.8 }}>
                  <div><Text type="secondary">PO:&nbsp;</Text>{a.PurchaseId || "-"}</div>
                  <div><Text type="secondary">Ngày:&nbsp;</Text>{fmtDate(a.PurchaseDate)}</div>
                  <div><Text type="secondary">Giá:&nbsp;</Text>{fmtMoney(a.PurchasePrice)}</div>
                </div>
              </Card>

              {/* Cột phải */}
              <Card size="small" bordered={true} bodyStyle={{ padding:12 }}>
                <Title level={5} style={{ marginTop:0 }}>Bảo hành</Title>
                <div style={{ lineHeight:1.8, marginBottom:8 }}>
                  <div><Text type="secondary">Start:&nbsp;</Text>{fmtDate(a.WarrantyStartDate)}</div>
                  <div><Text type="secondary">End:&nbsp;</Text>{fmtDate(a.WarrantyEndDate)}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <Progress percent={w.percent} size="small" status={w.active ? "active" : "normal"} />
                  </div>
                  {w.active ? <Tag color="green">Còn {w.daysLeft} ngày</Tag> : <Tag>Hết/không BH</Tag>}
                </div>
                <div style={{ fontSize:12, color:"#999" }}>
                  Tổng {w.totalDays} ngày • Đã dùng {w.percent}%
                </div>
              </Card>

              {/* Dòng 2 */}
              <Card size="small" bordered={true} bodyStyle={{ padding:12 }}>
                <Title level={5} style={{ marginTop:0 }}>Gán hiện tại</Title>
                <div style={{ lineHeight:1.8 }}>
                  <div><Text type="secondary">Nhân viên:&nbsp;</Text>{a.EmployeeName || "-"}</div>
                  <div><Text type="secondary">Phòng ban:&nbsp;</Text>{a.DepartmentName || "-"}</div>
                </div>
              </Card>

              <Card size="small" bordered={true} bodyStyle={{ padding:12 }}>
                <Title level={5} style={{ marginTop:0 }}>Thông tin khác</Title>
                <div style={{ lineHeight:1.8 }}>
                  <div><Text type="secondary">CategoryID:&nbsp;</Text>{shortId(a.CategoryID)}</div>
                  <div><Text type="secondary">ItemMasterID:&nbsp;</Text>{shortId(a.ItemMasterID)}</div>
                  <div><Text type="secondary">VendorID:&nbsp;</Text>{shortId(a.VendorID)}</div>
                </div>
              </Card>
            </div>

            {/* Thuộc tính kỹ thuật */}
            {Array.isArray(assetDetail?.attributes) && assetDetail.attributes.length > 0 && (
              <>
                <Title level={5} style={{ margin:0 }}>Thuộc tính kỹ thuật</Title>
                <List
                  grid={{ gutter:8, column:3 }}
                  dataSource={assetDetail.attributes}
                  renderItem={(att) => (
                    <List.Item key={att.ID}>
                      <Card size="small" bodyStyle={{ padding:"8px 10px" }}>
                        <div style={{ fontWeight:600 }}>{att.Name}</div>
                        <div style={{ color:"#555" }}>
                          {att.Value}{att.Unit ? ` ${att.Unit}` : ""}
                        </div>
                      </Card>
                    </List.Item>
                  )}
                />
              </>
            )}
          </div>
        );
      })()
    )}
  </Spin>
</Card>

    </div>
  );
}
