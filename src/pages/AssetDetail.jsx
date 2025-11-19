// src/pages/AssetDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Tooltip,
  Table,
  Tag,
  Spin,
  message,
  Input,
  Button,
  Popconfirm,
  Space,
  Modal,
  Form,
  Select,
  Row,
  Col,
  DatePicker,
  InputNumber,
} from "antd";
import { Typography } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import QrPreviewModal from "../components/assets/QrPreviewModal";
import { QrcodeOutlined, DownloadOutlined } from "@ant-design/icons";

const { Option } = Select;
const { Text, Paragraph, Title } = Typography;

const STATUS_MAP = {
  1: ["green", "Sẵn sàng"],
  2: ["blue", "Đang sử dụng"],
  3: ["orange", "Bảo hành"],
  4: ["volcano", "Sửa chữa"],
  5: ["red", "Hủy"],
  6: ["purple", "Thanh lý"],
};

const statusTag = (status) => {
  const [color, text] = STATUS_MAP[status] || ["default", "Không xác định"];
  return <Tag color={color}>{text}</Tag>;
};

// helpers
const toDayjs = (d) => (d ? dayjs(d) : null);
const fmtDate = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : null);
const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
};

const AssetDetailPage = () => {
  const { id } = useParams(); // /assetdetail/:id
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // detail
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [search, setSearch] = useState("");

  // master data
  const [categories, setCategories] = useState([]);
  const [itemMasters, setItemMasters] = useState([]);
  const [vendors, setVendors] = useState([]);

  // global attributes (add modal)
  const [allAttributes, setAllAttributes] = useState([]);
  const [attrLoading, setAttrLoading] = useState(false);

  // inline edit row
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");

  // modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  // ManageType hiện tại
  const [currentManageType, setCurrentManageType] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // QR modal
  const [qrState, setQrState] = useState({
    open: false,
    assetId: null,
    token: null,
    pngBase64: null,
    title: "",
  });

  const manageType = useMemo(() => {
    if (!asset || !itemMasters?.length) return null;
    const im = itemMasters.find(
      (i) => String(i.ID) === String(asset.ItemMasterID)
    );
    return im?.ManageType || null;
  }, [asset, itemMasters]);
  const isIndividual = manageType === "INDIVIDUAL";

  // Gọi API mint-qr rồi mở modal preview
  const showQr = async (force = false) => {
    if (!id) return;
    try {
      const url = `${API_URL}/api/qr/${id}/mint-qr${force ? "?force=1" : ""}`;
      const resp = await axios.post(
        url,
        {},
        {
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("token") || ""
            }`,
          },
        }
      );

      const { token, pngBase64 } = resp?.data?.data || {};
      if (!token) throw new Error("Mint QR không trả về token");

      setQrState({
        open: true,
        assetId: id,
        token,
        pngBase64: pngBase64 || null,
        title: asset?.Name || asset?.ManageCode || `Asset#${id}`,
      });
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Không tạo/hiển thị được QR");
    }
  };

  // ===== fetchers =====
  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/asset/assetdetail/${id}`);
      if (!res.data?.success || !res.data?.data) {
        message.error(res.data?.message || "Không lấy được chi tiết Asset");
        setAsset(null);
      } else {
        const { asset: a, attributes: attrs } = res.data.data;
        setAsset(a || null);
        setAttributes(Array.isArray(attrs) ? attrs : []);
      }
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tải chi tiết Asset");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/category`);
      setCategories(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchItemMasters = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/items`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setItemMasters(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vendor`);
      setVendors(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/getuserinfo`);
      const list = (res.data?.data || []).map((u) => ({
        value: Number(u.UserID),
        label: u.FullName || `User ${u.UserID}`,
      }));
      setEmployees(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/getdepartment`);
      const list = (res.data?.data || []).map((d) => ({
        value: Number(d.DepartmentID),
        label: d.DepartmentName || `Dept ${d.DepartmentID}`,
      }));
      setDepartments(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllAttributes = async () => {
    setAttrLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/attribute/attributeDetail`);
      if (res.data?.success) setAllAttributes(res.data.data || []);
      else message.error("Không thể tải danh sách thuộc tính");
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi tải danh sách thuộc tính");
    } finally {
      setAttrLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchAllAttributes();
    fetchCategories();
    fetchItemMasters();
    fetchVendors();
    fetchEmployees();
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Mở modal Edit: đổ form + suy ra ManageType
  const openEditModal = () => {
    if (!asset) return;
    const im = itemMasters.find(
      (i) => String(i.ID) === String(asset.ItemMasterID)
    );
    const mt = im?.ManageType || null;
    setCurrentManageType(mt);

    editForm.setFieldsValue({
      Name: asset.Name || "",
      ManageCode: asset.ManageCode || "",
      AssetCode: asset.AssetCode || null,
      CategoryID: asset.CategoryID || undefined,
      ItemMasterID: asset.ItemMasterID || undefined,
      VendorID: asset.VendorID || undefined,
      PurchaseId: asset.PurchaseId || null,
      QRCode: asset.QRCode || null,
      EmployeeID: asset.EmployeeID ?? null,
      SectionID: asset.SectionID ?? null,
      SerialNumber: asset.SerialNumber || null,
      Quantity: asset.Quantity ?? 1,
      Status: asset.Status ?? 1,
      PurchasePrice: asset.PurchasePrice ? Number(asset.PurchasePrice) : null,
      PurchaseDate: toDayjs(asset.PurchaseDate),
      WarrantyStartDate: toDayjs(asset.WarrantyStartDate),
      WarrantyEndDate: toDayjs(asset.WarrantyEndDate),
      WarrantyMonth: asset.WarrantyMonth ?? null,
    });
    setIsEditModalOpen(true);
  };

  const onEditIMChange = (val) => {
    const im = itemMasters.find((i) => String(i.ID) === String(val));
    const mt = im?.ManageType || null;
    setCurrentManageType(mt);

    if (im?.CategoryID) {
      editForm.setFieldsValue({ CategoryID: im.CategoryID });
    }
    if (mt === "INDIVIDUAL") {
      editForm.setFieldsValue({ Quantity: 1 });
    } else {
      editForm.setFieldsValue({ EmployeeID: null, SectionID: null });
    }
  };

  // ===== CRUD thuộc tính =====
  const handleAddConfig = async (values) => {
    try {
      const res = await axios.post(`${API_URL}/api/asset/assetconfig/add`, {
        AssetID: asset.ID,
        AttributeID: values.AttributeID,
        Value: values.Value?.trim() || null,
      });
      if (res.data?.success) {
        message.success("Thêm cấu hình thành công!");
        addForm.resetFields();
        setIsAddModalOpen(false);
        await fetchDetail();
      } else {
        message.error(res.data?.message || "Thêm thất bại.");
      }
    } catch (e) {
      console.error(e);
      message.error("Không thể thêm cấu hình.");
    }
  };

  const handleUpdateConfig = async (ID, value) => {
    if (!ID) return message.warning("Không tìm thấy ID để cập nhật.");
    try {
      const res = await axios.post(`${API_URL}/api/asset/assetconfig/update`, {
        ID,
        Value: value?.trim() || null,
      });
      if (res.data?.success) {
        message.success("Cập nhật thành công!");
        await fetchDetail();
      } else {
        message.error(res.data?.message || "Cập nhật thất bại.");
      }
    } catch (e) {
      console.error(e);
      message.error("Không thể cập nhật cấu hình.");
    } finally {
      setEditingKey(null);
      setEditValue("");
    }
  };

  const handleDeleteConfig = async (ID) => {
    if (!ID) return message.warning("Không tìm thấy ID để xóa.");
    try {
      const res = await axios.post(
        `${API_URL}/api/asset/assetconfig/delete/${ID}`
      );
      if (res.data?.success) {
        message.success("Xóa cấu hình thành công!");
        await fetchDetail();
      } else {
        message.error(res.data?.message || "Xóa thất bại.");
      }
    } catch (e) {
      console.error(e);
      message.error("Không thể xóa cấu hình.");
    }
  };

  // ===== Update Asset =====
  const handleUpdateAsset = async (values) => {
    if (!asset?.ID) return;
    try {
      const payload = {
        Name: nullIfEmpty(values.Name),
        ManageCode: nullIfEmpty(values.ManageCode),
        AssetCode: nullIfEmpty(values.AssetCode),
        CategoryID: nullIfEmpty(values.CategoryID),
        ItemMasterID: nullIfEmpty(values.ItemMasterID),
        VendorID: nullIfEmpty(values.VendorID),
        PurchaseId: nullIfEmpty(values.PurchaseId),
        QRCode: nullIfEmpty(values.QRCode),
        EmployeeID:
          currentManageType === "INDIVIDUAL"
            ? values.EmployeeID ?? null
            : null,
        SectionID:
          currentManageType === "INDIVIDUAL"
            ? values.SectionID ?? null
            : null,
        SerialNumber: nullIfEmpty(values.SerialNumber),
        Quantity:
          currentManageType === "INDIVIDUAL"
            ? 1
            : Math.max(Number(values.Quantity ?? 1), 1),
        Status: values.Status ?? null,
        PurchasePrice:
          values.PurchasePrice === undefined ||
          values.PurchasePrice === null
            ? null
            : Number(values.PurchasePrice),
        PurchaseDate: fmtDate(values.PurchaseDate),
        WarrantyStartDate: fmtDate(values.WarrantyStartDate),
        WarrantyEndDate: fmtDate(values.WarrantyEndDate),
        WarrantyMonth:
          values.WarrantyMonth === undefined ||
          values.WarrantyMonth === null
            ? null
            : Number(values.WarrantyMonth),
      };

      const res = await axios.post(
        `${API_URL}/api/asset/update/${asset.ID}`,
        payload
      );
      if (res.data?.success) {
        message.success("Cập nhật thông tin Asset thành công!");
        setIsEditModalOpen(false);
        fetchDetail();
      } else {
        message.error(res.data?.message || "Không thể cập nhật Asset");
      }
    } catch (e) {
      console.error(e);
      message.error("Lỗi khi cập nhật Asset");
    }
  };

  // ===== derived =====
  const filteredAttributes = useMemo(() => {
    if (!search?.trim()) return attributes;
    const q = search.trim().toLowerCase();
    return (attributes || []).filter(
      (r) =>
        r?.Name?.toLowerCase().includes(q) ||
        r?.Value?.toLowerCase().includes(q) ||
        (typeof r?.Unit === "string" &&
          r.Unit.toLowerCase().includes(q))
    );
  }, [attributes, search]);

  const copyValue = async (val) => {
    try {
      await navigator.clipboard.writeText(String(val ?? ""));
      message.success("Đã sao chép vào clipboard");
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    {
      title: "Thuộc tính",
      dataIndex: "Name",
      width: "28%",
      ellipsis: { showTitle: false },
      sorter: (a, b) => (a.Name || "").localeCompare(b.Name || ""),
      render: (v) => (
        <Tooltip title={v || ""} placement="topLeft">
          <Text strong>{v || "—"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Giá trị",
      dataIndex: "Value",
      width: "44%",
      render: (text, record) => {
        const isEditing = editingKey === record.ID;
        if (isEditing) {
          return (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Nhập giá trị…"
              allowClear
              autoFocus
              onPressEnter={() =>
                handleUpdateConfig(record.ID, editValue)
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditingKey(null);
                  setEditValue("");
                }
              }}
            />
          );
        }
        if (!text) {
          return (
            <Tag color="default" style={{ opacity: 0.75 }}>
              (Trống)
            </Tag>
          );
        }
        return (
          <Space size={6}>
            <Tooltip title={String(text)} placement="topLeft">
              <Paragraph
                style={{ margin: 0, maxWidth: 420 }}
                ellipsis={{ rows: 1, tooltip: false }}
              >
                {String(text)}
              </Paragraph>
            </Tooltip>
            <Tooltip title="Sao chép">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyValue(text)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: "Đơn vị",
      dataIndex: "Unit",
      width: 120,
      align: "center",
      render: (u) => (u ? <Tag color="blue">{u}</Tag> : "—"),
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 190,
      render: (_, record) => {
        const isEditing = editingKey === record.ID;
        return (
          <Space>
            {isEditing ? (
              <>
                <Tooltip title="Lưu">
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() =>
                      handleUpdateConfig(record.ID, editValue)
                    }
                  />
                </Tooltip>
                <Tooltip title="Hủy">
                  <Button
                    icon={<CloseOutlined />}
                    onClick={() => {
                      setEditingKey(null);
                      setEditValue("");
                    }}
                  />
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Chỉnh sửa">
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingKey(record.ID);
                      setEditValue(record.Value || "");
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title="Xác nhận xóa cấu hình này?"
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => handleDeleteConfig(record.ID)}
                >
                  <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  // ===== UI =====
  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" tip="Đang tải chi tiết tài sản..." />
      </div>
    );
  }

  if (!asset) {
    return (
      <Card style={{ margin: 16 }}>
        <Space direction="vertical">
          <Text type="danger">Không tìm thấy thiết bị.</Text>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        </Space>
      </Card>
    );
  }

  // Tính toán một chút cho phần tóm tắt
  const daysLeftWarranty =
    asset.WarrantyEndDate
      ? dayjs(asset.WarrantyEndDate).diff(dayjs(), "day")
      : null;

  return (
    <div style={{ padding: 16 }}>
      <Card
        style={{ borderRadius: 12 }}
        bodyStyle={{ padding: 16 }}
        title={
          <Space align="center" wrap>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            />
            <div>
              <Title
                level={4}
                style={{ margin: 0, marginBottom: 2 }}
              >
                {asset.Name || "Thiết bị không tên"}
              </Title>
              <Space size={8} wrap>
                {asset.ManageCode && (
                  <Tag color="processing">{asset.ManageCode}</Tag>
                )}
                {statusTag(asset.Status)}
                {manageType && (
                  <Tag color={isIndividual ? "purple" : "cyan"}>
                    {manageType}
                  </Tag>
                )}
              </Space>
            </div>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchDetail}>
              Làm mới
            </Button>
            <Button icon={<EditOutlined />} onClick={openEditModal}>
              Cập nhật thông tin
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Thêm cấu hình
            </Button>
          </Space>
        }
      >
        {/* Hàng trên: Thông tin chi tiết (to) + Tóm tắt & QR (nhỏ) */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title="Thông tin chi tiết"
              size="small"
              style={{ borderRadius: 10 }}
              bodyStyle={{ padding: 12 }}
            >
              <Row gutter={[12, 8]}>
                <Col xs={24} md={12}>
                  <Text type="secondary">Tên thiết bị</Text>
                  <div>{asset.Name || "—"}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Text type="secondary">Mã quản lý nội bộ</Text>
                  <div>{asset.ManageCode || "—"}</div>
                </Col>

                <Col xs={24} md={12}>
                  <Text type="secondary">Mã tài sản kế toán</Text>
                  <div>{asset.AssetCode || "—"}</div>
                </Col>
                <Col xs={24} md={12}>
                  <Text type="secondary">Danh mục</Text>
                  <div>
                    {asset.CategoryName || asset.CategoryID || "—"}
                  </div>
                </Col>

                <Col xs={24} md={12}>
                  <Text type="secondary">Item Master</Text>
                  <div>
                    {asset.ItemMasterName || asset.ItemMasterID || "—"}
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Text type="secondary">Serial</Text>
                  <div>{asset.SerialNumber || "—"}</div>
                </Col>

                <Col xs={24} md={8}>
                  <Text type="secondary">Số lượng</Text>
                  <div>{asset.Quantity ?? "—"}</div>
                </Col>
                <Col xs={24} md={8}>
                  <Text type="secondary">Số lượng còn lại</Text>
                  <div>
                    <Tag
                      color={
                        (asset.RemainQuantity ?? 0) > 0
                          ? "green"
                          : "red"
                      }
                    >
                      {asset.RemainQuantity ?? 0}
                    </Tag>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <Text type="secondary">Trạng thái</Text>
                  <div>{statusTag(asset.Status)}</div>
                </Col>

                <Col span={24}>
                  <div
                    style={{
                      borderTop: "1px dashed #f0f0f0",
                      margin: "8px 0",
                    }}
                  />
                </Col>

                <Col xs={24} md={12}>
                  <Text type="secondary">Nhà cung cấp</Text>
                  <div>
                    {asset.VendorName || asset.VendorID || "—"}
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Text type="secondary">Mã phiếu mua</Text>
                  <div>{asset.PurchaseId || "—"}</div>
                </Col>

                <Col xs={24} md={8}>
                  <Text type="secondary">Ngày mua</Text>
                  <div>{asset.PurchaseDate || "—"}</div>
                </Col>
                <Col xs={24} md={8}>
                  <Text type="secondary">Giá mua</Text>
                  <div>
                    {asset.PurchasePrice != null
                      ? asset.PurchasePrice
                      : "—"}
                  </div>
                </Col>
                

                <Col xs={24} md={8}>
                  <Text type="secondary">BH bắt đầu</Text>
                  <div>{asset.WarrantyStartDate || "—"}</div>
                </Col>
                <Col xs={24} md={8}>
                  <Text type="secondary">BH kết thúc</Text>
                  <div>{asset.WarrantyEndDate || "—"}</div>
                </Col>
                <Col xs={24} md={8}>
                  <Text type="secondary">Số tháng BH</Text>
                  <div>{asset.WarrantyMonth ?? "—"}</div>
                </Col>

                {isIndividual && (
                  <>
                    <Col xs={24} md={12}>
                      <Text type="secondary">Nhân viên đang sử dụng</Text>
                      <div>
                        {asset.EmployeeName || asset.EmployeeID || "—"}
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text type="secondary">Bộ phận / Phòng ban</Text>
                      <div>
                        {asset.DepartmentName || asset.SectionID || "—"}
                      </div>
                    </Col>
                  </>
                )}

                {asset.LastStocktakeAt && (
                  <>
                    <Col span={24}>
                      <div
                        style={{
                          borderTop: "1px dashed #f0f0f0",
                          margin: "8px 0",
                        }}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Text type="secondary">
                        Phiên kiểm kê gần nhất
                      </Text>
                      <div>{asset.LastStocktakeSessionID || "—"}</div>
                    </Col>
                    <Col xs={24} md={12}>
                      <Text type="secondary">
                        Thời điểm kiểm kê gần nhất
                      </Text>
                      <div>{asset.LastStocktakeAt || "—"}</div>
                    </Col>
                  </>
                )}
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title="Tóm tắt & QR Code"
              size="small"
              style={{ borderRadius: 10 }}
              bodyStyle={{ padding: 12 }}
            >
              <div
                style={{
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px dashed #d9d9d9",
                    background: "#fafafa",
                  }}
                >
                  <img
                    src={`${API_URL}/api/qr/${asset.ID}/qr.png`}
                    alt="QR Code"
                    style={{ width: 160, height: 160 }}
                    onError={(e) => {
                      // Nếu chưa mint QR thì ẩn hình
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size={8}
              >
                <Space wrap>
                  <Button
                    size="small"
                    icon={<QrcodeOutlined />}
                    onClick={() => showQr(false)}
                  >
                    Xem lớn / Mint QR
                  </Button>
                  <a
                    href={`${API_URL}/api/qr/${asset.ID}/qr.png`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                    >
                      Tải PNG
                    </Button>
                  </a>
                </Space>

                <div
                  style={{
                    borderTop: "1px dashed #f0f0f0",
                    margin: "8px 0",
                  }}
                />

                <Space
                  direction="vertical"
                  size={4}
                  style={{ width: "100%" }}
                >
                  <Text type="secondary">Mã nội bộ</Text>
                  <Text>{asset.ManageCode || "—"}</Text>

                  <Text type="secondary">Trạng thái</Text>
                  <div>{statusTag(asset.Status)}</div>

                  {isIndividual && (
                    <>
                      <Text type="secondary">Người dùng</Text>
                      <Text>
                        {asset.EmployeeName ||
                          asset.EmployeeID ||
                          "—"}
                      </Text>
                    </>
                  )}

                  <Text type="secondary">Phòng ban</Text>
                  <Text>
                    {asset.DepartmentName ||
                      asset.SectionName ||
                      asset.SectionID ||
                      "—"}
                  </Text>

                  <Text type="secondary">Bảo hành</Text>
                  <Text>
                    {asset.WarrantyEndDate
                      ? `${asset.WarrantyEndDate} ${
                          daysLeftWarranty != null
                            ? daysLeftWarranty >= 0
                              ? `(còn ~${daysLeftWarranty} ngày)`
                              : `(quá hạn ${Math.abs(
                                  daysLeftWarranty
                                )} ngày)`
                            : ""
                        }`
                      : "—"}
                  </Text>
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Thông số kỹ thuật – nhỏ hơn, ưu tiên thấp hơn */}
        <Card
          size="small"
          style={{ marginTop: 16, borderRadius: 10 }}
          title="Thông số kỹ thuật / Cấu hình chi tiết"
          extra={
            <Space>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Tìm theo tên/giá trị/đơn vị…"
                allowClear
                style={{ width: 260 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Tag>
                Tổng: {attributes?.length || 0} | Hiển thị:{" "}
                {filteredAttributes?.length || 0}
              </Tag>
            </Space>
          }
        >
          <Table
            dataSource={filteredAttributes || []}
            rowKey={(r) => r.ID}
            columns={columns}
            pagination={{ pageSize: 10 }}
            bordered
            size="middle"
          />
        </Card>
      </Card>

      {/* Modal thêm cấu hình */}
      <Modal
        title="Thêm cấu hình mới"
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        onOk={() => addForm.submit()}
        okText="Thêm"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddConfig}>
          <Form.Item
            label="Thuộc tính"
            name="AttributeID"
            rules={[{ required: true, message: "Chọn thuộc tính!" }]}
          >
            <Select
              showSearch
              allowClear
              loading={attrLoading}
              placeholder="Chọn thuộc tính"
              optionFilterProp="label"
            >
              {(allAttributes || []).map((a) => (
                <Option key={a.ID} value={a.ID}>
                  {a.MeasurementUnit
                    ? `${a.Name} (${a.MeasurementUnit})`
                    : a.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) =>
              prev.AttributeID !== curr.AttributeID
            }
          >
            {({ getFieldValue }) => {
              const selId = getFieldValue("AttributeID");
              const meta =
                (allAttributes || []).find((x) => x.ID === selId) ||
                {};
              const unit = meta?.MeasurementUnit || meta?.Unit || "";
              const placeholder = meta?.Name
                ? `Nhập ${meta.Name}${unit ? ` (${unit})` : ""}`
                : "Nhập giá trị cấu hình";
              return (
                <Form.Item
                  label="Giá trị"
                  name="Value"
                  rules={[{ required: true, message: "Nhập giá trị!" }]}
                >
                  <Input
                    placeholder={placeholder}
                    addonAfter={unit || undefined}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal cập nhật Asset */}
      <Modal
        title="Cập nhật thông tin tài sản"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={() => editForm.submit()}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        destroyOnClose
        width={840}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateAsset}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Tên thiết bị"
                name="Name"
                rules={[{ required: true, message: "Nhập tên thiết bị" }]}
              >
                <Input
                  placeholder="VD: Laptop Dell G5 5700"
                  allowClear
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Mã quản lý nội bộ"
                name="ManageCode"
                rules={[
                  { required: true, message: "Nhập mã quản lý nội bộ" },
                ]}
              >
                <Input placeholder="VD: IT-001" allowClear />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Mã tài sản kế toán" name="AssetCode">
                <Input placeholder="VD: B-001" allowClear />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Danh mục"
                name="CategoryID"
                rules={[{ required: true, message: "Chọn danh mục" }]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn danh mục"
                  optionFilterProp="children"
                >
                  {categories.map((c) => (
                    <Option key={c.ID} value={c.ID}>
                      {c.Name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Item Master" name="ItemMasterID">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn ItemMaster"
                  optionFilterProp="children"
                  onChange={onEditIMChange}
                >
                  {itemMasters.map((i) => (
                    <Option key={i.ID} value={i.ID}>
                      {i.Name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              {currentManageType && (
                <div
                  style={{
                    marginTop: -8,
                    marginBottom: 8,
                    opacity: 0.75,
                  }}
                >
                  Kiểu quản lý:{" "}
                  <Tag
                    color={
                      currentManageType === "INDIVIDUAL"
                        ? "purple"
                        : "cyan"
                    }
                  >
                    {currentManageType}
                  </Tag>
                </div>
              )}
            </Col>

            <Col span={12}>
              <Form.Item label="Nhà cung cấp" name="VendorID">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn Vendor"
                  optionFilterProp="children"
                >
                  {vendors.map((v) => (
                    <Option key={v.ID} value={v.ID}>
                      {v.Name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Mã phiếu mua" name="PurchaseId">
                <Input placeholder="VD: PO-2024-001" allowClear />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="QR Code" name="QRCode">
                <Input placeholder="QR nội dung" allowClear />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Ngày mua" name="PurchaseDate">
                <DatePicker
                  format="YYYY-MM-DD"
                  style={{ width: "100%" }}
                  placeholder="Chọn ngày mua"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Giá mua" name="PurchasePrice">
                <InputNumber
                  min={0}
                  step={100000}
                  style={{ width: "100%" }}
                  placeholder="VD: 15,000,000"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Bảo hành bắt đầu"
                name="WarrantyStartDate"
              >
                <DatePicker
                  format="YYYY-MM-DD"
                  style={{ width: "100%" }}
                  placeholder="Chọn ngày bắt đầu"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Bảo hành kết thúc"
                name="WarrantyEndDate"
              >
                <DatePicker
                  format="YYYY-MM-DD"
                  style={{ width: "100%" }}
                  placeholder="Chọn ngày kết thúc"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Số tháng bảo hành"
                name="WarrantyMonth"
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="VD: 12"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="SerialNumber" name="SerialNumber">
                <Input placeholder="VD: SN-12345" allowClear />
              </Form.Item>
            </Col>

            {currentManageType === "INDIVIDUAL" && (
              <>
                <Col span={12}>
                  <Form.Item
                    label="Người sử dụng"
                    name="EmployeeID"
                  >
                    <Select
                      showSearch
                      allowClear
                      placeholder="Chọn người dùng"
                      options={employees}
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item label="Phòng ban" name="SectionID">
                    <Select
                      showSearch
                      allowClear
                      placeholder="Chọn phòng ban"
                      options={departments}
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </Col>
              </>
            )}

            <Col span={12}>
              <Form.Item label="Số lượng" name="Quantity">
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  disabled={currentManageType === "INDIVIDUAL"}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Trạng thái"
                name="Status"
                initialValue={1}
              >
                <Select>
                  <Option value={1}>Sẵn sàng</Option>
                  <Option value={2}>Đang dùng</Option>
                  <Option value={3}>Bảo hành</Option>
                  <Option value={4}>Sửa chữa</Option>
                  <Option value={5}>Hủy</Option>
                  <Option value={6}>Thanh lý</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <QrPreviewModal
        open={qrState.open}
        title={qrState.title}
        token={qrState.token}
        assetId={qrState.assetId}
        pngBase64={qrState.pngBase64}
        onClose={() =>
          setQrState({
            open: false,
            assetId: null,
            token: null,
            pngBase64: null,
            title: "",
          })
        }
        size={512}
      />
    </div>
  );
};

export default AssetDetailPage;
