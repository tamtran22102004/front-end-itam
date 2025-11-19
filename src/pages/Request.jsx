// src/pages/RequestCreatePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  message,
  Tooltip,
  Typography,
  Divider,
  Alert,
  Table,
  Radio,
} from "antd";
import {
  SendOutlined,
  RedoOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  ToolOutlined,
  DeleteOutlined,
  SafetyOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

const API_URL = import.meta.env.VITE_BACKEND_URL;
const CREATE_BASE = `${API_URL}/api/request/createrequest`;
const ASSET_LIST_BASE = `${API_URL}/api/asset`;
const USERS_API = `${API_URL}/api/getuserinfo`;
const DEPT_API = `${API_URL}/api/getdepartment`;

// 🔹 Department ID của kho
const WAREHOUSE_DEPT_ID = 5;

// 🔹 Mode của TRANSFER
const TRANSFER_MODE = {
  WAREHOUSE: "WAREHOUSE", // chuyển về kho
  USER: "USER", // chuyển người ↔ người
};

const REQUEST_TYPES = [
  {
    value: "ALLOCATION",
    label: (
      <>
        <DatabaseOutlined /> Allocation (Cấp phát)
      </>
    ),
  },
  {
    value: "MAINTENANCE",
    label: (
      <>
        <ToolOutlined /> Maintenance (Bảo trì)
      </>
    ),
  },
  {
    value: "DISPOSAL",
    label: (
      <>
        <DeleteOutlined /> Disposal (Thanh lý)
      </>
    ),
  },
  {
    value: "WARRANTY",
    label: (
      <>
        <SafetyOutlined /> Warranty (Bảo hành)
      </>
    ),
  },
  {
    value: "TRANSFER",
    label: (
      <>
        <SwapOutlined /> Transfer (Chuyển giao)
      </>
    ),
  },
];

const getToken = () => localStorage.getItem("token") || "";
const withAuth = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const normalizeUser = (u) =>
  !u
    ? null
    : {
        UserID: u.UserID ?? u.userID ?? u.userId ?? u.id ?? null,
        DepartmentID:
          u.DepartmentID ?? u.departmentID ?? u.departmentId ?? u.deptId ?? null,
        Role: String(u.Role ?? u.role ?? "").toUpperCase() || null,
        FullName: u.FullName ?? u.fullname ?? u.fullName ?? u.name ?? "",
        Email: u.Email ?? u.email ?? "",
      };

// ===== Asset helpers =====
const STATUS = {
  AVAILABLE: 1,
  ALLOCATED: 2,
  MAINTENANCE_OUT: 3,
  WARRANTY_OUT: 4,
  DISPOSED: 5,
  IN_USE: 6,
};

const STATUS_LABEL = {
  [STATUS.AVAILABLE]: "AVAILABLE",
  [STATUS.ALLOCATED]: "ALLOCATED",
  [STATUS.MAINTENANCE_OUT]: "MAINTENANCE_OUT",
  [STATUS.WARRANTY_OUT]: "WARRANTY_OUT",
  [STATUS.DISPOSED]: "DISPOSED",
  [STATUS.IN_USE]: "IN_USE",
};

const STATUS_COLOR = {
  [STATUS.AVAILABLE]: "green",
  [STATUS.ALLOCATED]: "blue",
  [STATUS.MAINTENANCE_OUT]: "orange",
  [STATUS.WARRANTY_OUT]: "gold",
  [STATUS.DISPOSED]: "red",
  [STATUS.IN_USE]: "cyan",
};

// 🔹 Kiểm tra còn hạn bảo hành hay không (dựa vào WarrantyEndDate)
const isInWarranty = (asset) => {
  if (!asset) return false;
  const endRaw =
    asset.WarrantyEndDate ??
    asset.warrantyEndDate ??
    asset.warranty_end_date ??
    null;
  if (!endRaw) return false;

  const endTime = new Date(endRaw).getTime();
  if (Number.isNaN(endTime)) return false;

  const now = Date.now();
  return endTime >= now;
};

// 🔹 rule theo Type + Asset (full object)
//   ⇒ để WARRRANTY chỉ cho chọn thiết bị còn hạn bảo hành
const allowedByTypeLite = (type, asset) => {
  if (!asset) return false;
  const s = Number(asset.Status);

  switch (type) {
    case "ALLOCATION":
      return s === STATUS.AVAILABLE;

    case "MAINTENANCE":
      return ![
        STATUS.DISPOSED,
        STATUS.MAINTENANCE_OUT,
        STATUS.WARRANTY_OUT,
      ].includes(s);

    case "WARRANTY":
      // chỉ cho chọn asset KHÔNG DISPOSED và đang còn hạn bảo hành
      return s !== STATUS.DISPOSED && isInWarranty(asset);

    case "DISPOSAL":
      return ![
        STATUS.DISPOSED,
        STATUS.ALLOCATED,
        STATUS.MAINTENANCE_OUT,
        STATUS.WARRANTY_OUT,
      ].includes(s);

    // TRANSFER: cho chuyển những cái đang dùng (ALLOCATED / IN_USE)
    case "TRANSFER":
      return [STATUS.ALLOCATED, STATUS.IN_USE,STATUS.WARRANTY_OUT,STATUS.MAINTENANCE_OUT].includes(s);

    default:
      return true;
  }
};

const extractAssets = (resp) => {
  const d = resp?.data;
  if (Array.isArray(d?.assets)) return d.assets;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d)) return d;
  return [];
};

// 🔹 Chuẩn hoá asset, giữ thêm WarrantyStartDate, WarrantyEndDate
const normListItem = (a) => ({
  ID: a.ID ?? a.id ?? a.AssetID ?? a.assetId,
  Name: a.Name ?? a.name ?? "",
  ManageCode: a.ManageCode ?? a.manageCode ?? "",
  AssetCode: a.AssetCode ?? a.assetCode ?? "",
  SerialNumber: a.SerialNumber ?? a.serialNumber ?? "",
  Status: Number(a.Status ?? a.status ?? 0),
  WarrantyStartDate:
    a.WarrantyStartDate ?? a.warrantyStartDate ?? a.warranty_start_date ?? null,
  WarrantyEndDate:
    a.WarrantyEndDate ?? a.warrantyEndDate ?? a.warranty_end_date ?? null,
});

export default function RequestCreatePage() {
  const [form] = Form.useForm();
  const [currentUser, setCurrentUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  const type = Form.useWatch("type", form);
  const transferMode = Form.useWatch("transferMode", form);
  const watchTargetUserId = Form.useWatch("TargetUserID", form);
  const watchTargetDeptId = Form.useWatch("TargetDepartmentID", form);

  // ===== current user =====
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw && raw !== "undefined")
        setCurrentUser(normalizeUser(JSON.parse(raw)));
    } catch {
      // ignore
    }
  }, []);

  // ===== fetch assets =====
  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      const resp = await axios.get(ASSET_LIST_BASE, withAuth());
      setAssets(
        extractAssets(resp)
          .map(normListItem)
          .filter((x) => x.ID)
      );
    } catch (e) {
      message.error(
        e?.response?.data?.message || "Không tải được danh sách thiết bị"
      );
    } finally {
      setLoadingAssets(false);
    }
  };
  useEffect(() => {
    fetchAssets();
  }, []);

  // ===== fetch users =====
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const resp = await axios.get(USERS_API, withAuth());
      const raw = Array.isArray(resp?.data?.data)
        ? resp.data.data
        : Array.isArray(resp?.data)
        ? resp.data
        : [];
      setUsers(
        raw.map((u) => ({
          value: Number(u.UserID),
          label: u.FullName || `User ${u.UserID}`,
          DepartmentID: u.DepartmentID ?? null,
          raw: u,
        }))
      );
    } catch (e) {
      message.error(
        e?.response?.data?.message || "Không tải được danh sách người dùng"
      );
    } finally {
      setLoadingUsers(false);
    }
  };
  useEffect(() => {
    fetchUsers();
  }, []);

  // ===== fetch departments =====
  const fetchDepartments = async () => {
    setLoadingDepts(true);
    try {
      const resp = await axios.get(DEPT_API, withAuth());
      const arr = Array.isArray(resp?.data?.data)
        ? resp.data.data
        : Array.isArray(resp?.data)
        ? resp.data
        : [];
      setDepartments(
        arr.map((d) => ({
          value: Number(d.DepartmentID ?? d.id),
          label: d.DepartmentName ?? d.name ?? `Dept ${d.DepartmentID}`,
        }))
      );
    } catch (e) {
      message.error(
        e?.response?.data?.message || "Không tải được danh sách phòng ban"
      );
    } finally {
      setLoadingDepts(false);
    }
  };
  useEffect(() => {
    fetchDepartments();
  }, []);

  // 🔹 Khi type = TRANSFER + mode = WAREHOUSE → auto Dept = kho, clear User
  useEffect(() => {
    if (type === "TRANSFER" && transferMode === TRANSFER_MODE.WAREHOUSE) {
      const currDept = form.getFieldValue("TargetDepartmentID");
      if (Number(currDept) !== WAREHOUSE_DEPT_ID) {
        form.setFieldValue("TargetDepartmentID", WAREHOUSE_DEPT_ID);
      }
      form.setFieldValue("TargetUserID", null);
    }
  }, [type, transferMode, form]);

  // Khi chọn User → auto set Dept nếu chưa chọn (trừ TRANSFER về kho)
  useEffect(() => {
    if (!watchTargetUserId) return;
    if (type === "TRANSFER" && transferMode === TRANSFER_MODE.WAREHOUSE) return;

    const u = users.find((x) => Number(x.value) === Number(watchTargetUserId));
    if (
      !form.getFieldValue("TargetDepartmentID") &&
      u?.DepartmentID != null
    ) {
      form.setFieldValue("TargetDepartmentID", Number(u.DepartmentID));
    }
  }, [watchTargetUserId, users, form, type, transferMode]);

  // 🔹 Dept options tuỳ theo loại phiếu + mode
  const deptOptions = useMemo(() => {
    if (!Array.isArray(departments)) return [];

    // TRANSFER + về kho → chỉ cho chọn đúng kho
    if (type === "TRANSFER" && transferMode === TRANSFER_MODE.WAREHOUSE) {
      return departments.filter(
        (d) => Number(d.value) === WAREHOUSE_DEPT_ID
      );
    }

    // TRANSFER + USER → không cho chọn kho
    if (type === "TRANSFER" && transferMode === TRANSFER_MODE.USER) {
      return departments.filter(
        (d) => Number(d.value) !== WAREHOUSE_DEPT_ID
      );
    }

    // Các loại khác: cũng không cho chọn kho (theo yêu cầu)
    return departments.filter((d) => Number(d.value) !== WAREHOUSE_DEPT_ID);
  }, [departments, type, transferMode]);

  // 🔹 Filter user theo Dept, nhưng nếu TRANSFER + về kho → không cần user
  const userOptions = useMemo(() => {
    if (type === "TRANSFER" && transferMode === TRANSFER_MODE.WAREHOUSE) {
      return [];
    }
    const dept = Number(watchTargetDeptId || 0);
    const list = dept
      ? users.filter((u) => Number(u.DepartmentID || 0) === dept)
      : users;
    return list;
  }, [users, watchTargetDeptId, type, transferMode]);

  // ===== filter assets theo search =====
  const filteredAssets = useMemo(() => {
    const s = assetSearch.toLowerCase().trim();
    let list = assets;
    if (s) {
      list = list.filter((a) => {
        const keys = [a.ManageCode, a.AssetCode, a.SerialNumber, a.Name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return keys.includes(s);
      });
    }
    return list;
  }, [assets, assetSearch]);

  // Khi đổi loại request → tự bỏ chọn những asset không hợp lệ theo rule mới
  useEffect(() => {
    if (!type) return;
    setSelectedAssetIds((prev) =>
      prev.filter((id) => {
        const a = assets.find((x) => x.ID === id);
        return a && allowedByTypeLite(type, a);
      })
    );
  }, [type, assets]);

  // ===== columns bảng Asset =====
  const assetColumns = useMemo(
    () => [
      {
        title: "Mã quản lý / Mã tài sản / Serial",
        key: "code",
        render: (a) => (
          <div>
            <div style={{ fontWeight: 600 }}>
              {a.ManageCode || a.AssetCode || a.SerialNumber || a.ID}
            </div>
            <div style={{ color: "#666", fontSize: 12 }}>
              {a.SerialNumber ? `SN: ${a.SerialNumber}` : null}
            </div>
          </div>
        ),
      },
      {
        title: "Tên thiết bị",
        dataIndex: "Name",
        key: "Name",
      },
      {
        title: "Trạng thái",
        dataIndex: "Status",
        key: "Status",
        width: 140,
        render: (st) => (
          <Tag color={STATUS_COLOR[st] || "default"}>
            {STATUS_LABEL[st] || st || "-"}
          </Tag>
        ),
      },
      // (Optional) Nếu muốn nhìn hạn bảo hành cho dễ debug, mở comment dưới:
      // {
      //   title: "Hạn bảo hành",
      //   dataIndex: "WarrantyEndDate",
      //   key: "WarrantyEndDate",
      //   width: 150,
      //   render: (v) => (v ? String(v).slice(0, 10) : "-"),
      // },
    ],
    []
  );

  // ===== SUBMIT REQUEST =====
  const onFinish = async (values) => {
    if (!currentUser?.UserID)
      return message.error("Không xác định người tạo yêu cầu.");

    if (!selectedAssetIds.length) {
      message.error("Vui lòng chọn ít nhất một thiết bị.");
      return;
    }

    const typeCode = values.type;
    const mode = values.transferMode || TRANSFER_MODE.USER;

    // Validate lý do chung theo loại
    if (typeCode === "MAINTENANCE") {
      if (
        !values.IssueDescription ||
        String(values.IssueDescription).trim().length < 5
      ) {
        message.error("Nhập mô tả sự cố (≥ 5 ký tự).");
        return;
      }
    }
    if (typeCode === "DISPOSAL") {
      if (!values.Reason || String(values.Reason).trim().length < 3) {
        message.error("Nhập lý do thanh lý (≥ 3 ký tự).");
        return;
      }
    }
    if (typeCode === "WARRANTY") {
      if (
        !values.WarrantyProvider ||
        !String(values.WarrantyProvider).trim()
      ) {
        message.error("Nhập đơn vị bảo hành.");
        return;
      }
    }

    // 🔹 VALIDATE THEO MODE TRANSFER
    if (typeCode === "TRANSFER") {
      if (mode === TRANSFER_MODE.USER) {
        // Chuyển sang người khác: phải có User + Dept != kho
        if (!values.TargetUserID) {
          message.error("Chuyển giao sang người khác phải chọn Người nhận.");
          return;
        }
        if (Number(values.TargetDepartmentID) === WAREHOUSE_DEPT_ID) {
          message.error(
            "Chuyển giao sang người khác không được chọn phòng Kho."
          );
          return;
        }
      }

      if (mode === TRANSFER_MODE.WAREHOUSE) {
        // Chuyển về kho: Dept phải là kho, không cần User
        if (Number(values.TargetDepartmentID) !== WAREHOUSE_DEPT_ID) {
          message.error(
            "Chuyển giao về kho phải chọn đúng phòng Kho."
          );
          return;
        }
        values.TargetUserID = null;
      }
    } else {
      // Các loại khác: luôn yêu cầu User + Dept, và Dept không được là kho
      if (!values.TargetUserID) {
        message.error("Chọn Người nhận (TargetUserID).");
        return;
      }
      if (values.TargetDepartmentID == null) {
        message.error("Chọn Phòng ban nhận (TargetDepartmentID).");
        return;
      }
      if (Number(values.TargetDepartmentID) === WAREHOUSE_DEPT_ID) {
        message.error(
          "Phòng Kho chỉ dùng cho phiếu Transfer. Loại yêu cầu hiện tại không được chuyển vào kho."
        );
        return;
      }
    }

    const items = selectedAssetIds.map((id) => {
      const base = {
        AssetID: id,
        Quantity: 1, // mỗi thiết bị = 1 đơn vị
      };
      if (typeCode === "MAINTENANCE")
        base.IssueDescription = values.IssueDescription;
      if (typeCode === "DISPOSAL") base.Reason = values.Reason;
      if (typeCode === "WARRANTY")
        base.WarrantyProvider = values.WarrantyProvider;
      return base;
    });

    const payload = {
      typeCode,
      RequesterUserID: currentUser.UserID,
      Note: values.Note || null,
      TargetDepartmentID: Number(values.TargetDepartmentID),
      Items: items,
    };

    // TargetUserID chỉ gửi khi không phải TRANSFER về kho
    if (
      !(
        typeCode === "TRANSFER" &&
        mode === TRANSFER_MODE.WAREHOUSE
      ) &&
      values.TargetUserID
    ) {
      payload.TargetUserID = Number(values.TargetUserID);
    }

    // Gửi thêm mode để backend có thể phân nhánh sau này (nếu cần)
    if (typeCode === "TRANSFER") {
      payload.TransferMode = mode;
    }

    Object.keys(payload).forEach(
      (k) => payload[k] === undefined && delete payload[k]
    );

    setSubmitting(true);
    try {
      const resp = await axios.post(CREATE_BASE, payload, withAuth());
      const rid = resp?.data?.data?.RequestID;
      message.success(resp?.data?.message || "Tạo yêu cầu thành công");
      if (rid) message.info(`RequestID: ${rid}`);

      form.resetFields();
      form.setFieldValue("type", typeCode);
      form.setFieldValue("transferMode", TRANSFER_MODE.USER);
      setSelectedAssetIds([]);
    } catch (e) {
      message.error(e?.response?.data?.message || "Không tạo được yêu cầu");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* HEADER */}
      <Card
        size="small"
        bodyStyle={{ padding: 10 }}
        style={{ borderRadius: 10, marginBottom: 12 }}
      >
        <Space wrap>
          <Title level={5} style={{ margin: 0 }}>
            Tạo yêu cầu
          </Title>
          <Divider type="vertical" />
          <Tag>
            Người tạo:{" "}
            <b>
              {currentUser?.FullName ||
                currentUser?.Email ||
                currentUser?.UserID ||
                "-"}
            </b>
          </Tag>
          <Tag>
            Role: <b>{currentUser?.Role || "-"}</b>
          </Tag>
          <Tooltip title="Tải lại danh sách thiết bị">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={fetchAssets}
              loading={loadingAssets}
            >
              Reload assets
            </Button>
          </Tooltip>

          {/* Tag hiển thị người nhận nếu có */}
          {watchTargetUserId && (
            <Tag color="blue">
              Người nhận:{" "}
              {
                users.find(
                  (u) => Number(u.value) === Number(watchTargetUserId)
                )?.label
              }
            </Tag>
          )}

          {watchTargetDeptId != null && (
            <Tag color="geekblue">
              Phòng ban nhận:{" "}
              {departments.find(
                (d) => Number(d.value) === Number(watchTargetDeptId)
              )?.label || watchTargetDeptId}
            </Tag>
          )}

          <Tag color="purple">
            Đã chọn: <b>{selectedAssetIds.length}</b> thiết bị
          </Tag>

          {type === "TRANSFER" && (
            <Tag color="magenta">
              Mode:{" "}
              <b>
                {transferMode === TRANSFER_MODE.WAREHOUSE
                  ? "Chuyển về kho"
                  : "Chuyển sang người khác"}
              </b>
            </Tag>
          )}
        </Space>
      </Card>

      {/* FORM + TABLE */}
      <Card
        size="small"
        style={{ borderRadius: 10 }}
        bodyStyle={{ padding: 14 }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 10 }}
          message={
            <Space size={6}>
              <InfoCircleOutlined />
              <span>
                Chọn loại yêu cầu & người nhận / kho. Sau đó tick nhiều thiết bị
                trong bảng bên dưới rồi bấm <b>“Gửi yêu cầu”</b>.
              </span>
            </Space>
          }
        />

        <Form
          form={form}
          size="small"
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            type: "ALLOCATION",
            transferMode: TRANSFER_MODE.USER,
          }}
        >
          {/* HÀNG 1: Loại + Mode (nếu TRANSFER) + Dept + User */}
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns:
                type === "TRANSFER"
                  ? "minmax(200px, 1.2fr) minmax(260px, 1.6fr) minmax(220px, 1fr) minmax(220px, 1fr)"
                  : "minmax(220px, 1fr) minmax(220px, 1fr) minmax(220px, 1fr)",
              marginBottom: 8,
            }}
          >
            <Form.Item
              name="type"
              label="Loại yêu cầu"
              rules={[{ required: true, message: "Chọn loại yêu cầu" }]}
            >
              <Select options={REQUEST_TYPES} />
            </Form.Item>

            {type === "TRANSFER" && (
              <Form.Item
                name="transferMode"
                label="Kiểu chuyển giao"
                rules={[{ required: true, message: "Chọn kiểu chuyển giao" }]}
              >
                <Radio.Group>
                  <Radio value={TRANSFER_MODE.USER}>
                    Chuyển sang người khác
                  </Radio>
                  <Radio value={TRANSFER_MODE.WAREHOUSE}>
                    Chuyển về kho
                  </Radio>
                </Radio.Group>
              </Form.Item>
            )}

            <Form.Item
              name="TargetDepartmentID"
              label="Phòng ban nhận"
              rules={[{ required: true, message: "Chọn phòng ban nhận" }]}
            >
              <Select
                showSearch
                placeholder="Chọn phòng ban…"
                loading={loadingDepts}
                options={deptOptions}
                optionFilterProp="label"
                disabled={
                  type === "TRANSFER" &&
                  transferMode === TRANSFER_MODE.WAREHOUSE
                }
                allowClear={
                  !(
                    type === "TRANSFER" &&
                    transferMode === TRANSFER_MODE.WAREHOUSE
                  )
                }
              />
            </Form.Item>

            {(type !== "TRANSFER" ||
              (type === "TRANSFER" &&
                transferMode === TRANSFER_MODE.USER)) && (
              <Form.Item
                name="TargetUserID"
                label="Người nhận"
                rules={
                  type === "TRANSFER" && transferMode === TRANSFER_MODE.USER
                    ? [{ required: true, message: "Chọn người nhận" }]
                    : type !== "TRANSFER"
                    ? [{ required: true, message: "Chọn người nhận" }]
                    : []
                }
                tooltip="Khi chọn phòng ban trước, danh sách người nhận sẽ lọc theo phòng ban đó."
              >
                <Select
                  showSearch
                  placeholder="Chọn người nhận…"
                  loading={loadingUsers}
                  options={userOptions}
                  optionFilterProp="label"
                  allowClear
                />
              </Form.Item>
            )}
          </div>

          {/* LÝ DO CHUNG THEO LOẠI */}
          {type === "MAINTENANCE" && (
            <Form.Item
              name="IssueDescription"
              label="Mô tả sự cố (áp dụng chung cho tất cả thiết bị)"
            >
              <Input.TextArea
                rows={3}
                maxLength={500}
                placeholder="VD: Máy nóng, quạt kêu lớn..."
              />
            </Form.Item>
          )}
          {type === "DISPOSAL" && (
            <Form.Item
              name="Reason"
              label="Lý do thanh lý (áp dụng chung cho tất cả thiết bị)"
            >
              <Input.TextArea
                rows={3}
                maxLength={500}
                placeholder="VD: Không còn sử dụng..."
              />
            </Form.Item>
          )}
          {type === "WARRANTY" && (
            <Form.Item
              name="WarrantyProvider"
              label="Đơn vị bảo hành (áp dụng chung cho tất cả thiết bị)"
            >
              <Input placeholder="VD: TT Bảo hành ABC" />
            </Form.Item>
          )}

          <Form.Item name="Note" label="Ghi chú chung cho phiếu">
            <Input.TextArea
              rows={3}
              maxLength={500}
              placeholder="Ghi chú thêm (tuỳ chọn)"
            />
          </Form.Item>

          <Divider style={{ margin: "8px 0 10px" }} />

          {/* BẢNG CHỌN THIẾT BỊ */}
          <div style={{ marginBottom: 8 }}>
            <Space style={{ marginBottom: 6 }}>
              <Text strong>Chọn thiết bị</Text>
              <Input
                placeholder="Tìm theo mã / serial / tên..."
                allowClear
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                style={{ width: 260 }}
              />
              <Text type="secondary">
                Tick vào checkbox để chọn nhiều thiết bị.{" "}
                {type === "TRANSFER" &&
                  "(Chỉ cho phép chọn thiết bị đang được sử dụng)"}{" "}
                {type === "WARRANTY" &&
                  "(Chỉ cho phép chọn thiết bị còn trong thời gian bảo hành)"}
              </Text>
            </Space>

            <Table
              size="small"
              rowKey="ID"
              loading={loadingAssets}
              dataSource={filteredAssets}
              columns={assetColumns}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              rowSelection={{
                selectedRowKeys: selectedAssetIds,
                onChange: setSelectedAssetIds,
                getCheckboxProps: (record) => ({
                  disabled: !allowedByTypeLite(type, record),
                }),
              }}
              bordered
            />
          </div>

          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={submitting}
              disabled={!currentUser}
            >
              Gửi yêu cầu
            </Button>
            <Button
              htmlType="button"
              icon={<RedoOutlined />}
              onClick={() => {
                form.resetFields();
                form.setFieldValue("type", "ALLOCATION");
                form.setFieldValue("transferMode", TRANSFER_MODE.USER);
                setSelectedAssetIds([]);
              }}
            >
              Xoá form
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
