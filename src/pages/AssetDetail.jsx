import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Descriptions,
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
  Divider,
  Empty,
  DatePicker,
  InputNumber,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import AssetQrSection from "../components/form/AssetQrSection";
const { Option } = Select;

// --- JS thuần, KHÔNG TypeScript annotation ---
const STATUS_MAP = {
  1: ["green", "Sẵn sàng"],
  2: ["blue", "Đang sử dụng"],
  3: ["orange", "Bảo hành"],
  4: ["volcano", "Sửa chữa"],
  5: ["red", "Hủy"],
  6: ["purple", "Thanh lý"],
};

const statusTag = (status) => {
  const pair = STATUS_MAP[status] || ["default", "Không xác định"];
  const [color, text] = pair;
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
  const { id } = useParams(); // /asset/detail/:id
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
  // Nếu chưa có API users/departments thì giữ nguyên input number
  // const [users, setUsers] = useState([]);
  // const [departments, setDepartments] = useState([]);

  // global attributes (add modal)
  const [allAttributes, setAllAttributes] = useState([]);
  const [attrLoading, setAttrLoading] = useState(false);

  // inline edit config row
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");

  // modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  // ManageType hiện tại để khóa Quantity nếu INDIVIDUAL
  const [currentManageType, setCurrentManageType] = useState(null);
  const [employees, setEmployees] = useState([]); // mảng { value, label }
  const [departments, setDepartments] = useState([]);

  // ===== fetchers =====
  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/asset/assetdetail/${id}`);
      if (!res.data?.success || !res.data?.data) {
        message.error(res.data?.message || "Không lấy được chi tiết Asset");
        setLoading(false);
        return;
      }
      const { asset: a, attributes: attrs } = res.data.data;
      setAsset(a || null);
      setAttributes(Array.isArray(attrs) ? attrs : []);
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
    } catch {}
  };

  const fetchItemMasters = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/items`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setItemMasters(data);
    } catch {}
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vendor`);
      setVendors(res.data?.data || []);
    } catch {}
  };
  // fetch employees
  // --- fetchers ---
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
  // Nếu có API:
  // const fetchUsers = async () => { ... };
  // const fetchDepartments = async () => { ... };

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
  }, [id]);

  // Mở modal Edit: đổ form + suy ra ManageType
  const openEditModal = () => {
    if (!asset) return;
    const im = itemMasters.find((i) => i.ID === asset.ItemMasterID);
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

  // Khi đổi ItemMaster trong modal edit
  const onEditIMChange = (val) => {
    const im = itemMasters.find((i) => i.ID === val);
    const mt = im?.ManageType || null;
    setCurrentManageType(mt);
    if (im?.CategoryID) {
      editForm.setFieldsValue({ CategoryID: im.CategoryID });
    }
    if (mt === "INDIVIDUAL") {
      editForm.setFieldsValue({ Quantity: 1 });
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
        CategoryID: nullIfEmpty(values.CategoryID), // required ở form
        ItemMasterID: nullIfEmpty(values.ItemMasterID),
        VendorID: nullIfEmpty(values.VendorID),
        PurchaseId: nullIfEmpty(values.PurchaseId),
        QRCode: nullIfEmpty(values.QRCode),
        EmployeeID: values.EmployeeID ?? null,
        SectionID: values.SectionID ?? null,
        SerialNumber: nullIfEmpty(values.SerialNumber),
        Quantity:
          currentManageType === "INDIVIDUAL"
            ? 1
            : Math.max(Number(values.Quantity ?? 1), 1),
        Status: values.Status ?? null,
        PurchasePrice:
          values.PurchasePrice === undefined || values.PurchasePrice === null
            ? null
            : Number(values.PurchasePrice),
        PurchaseDate: fmtDate(values.PurchaseDate),
        WarrantyStartDate: fmtDate(values.WarrantyStartDate),
        WarrantyEndDate: fmtDate(values.WarrantyEndDate),
        WarrantyMonth:
          values.WarrantyMonth === undefined || values.WarrantyMonth === null
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
        (typeof r?.Unit === "string" && r.Unit.toLowerCase().includes(q))
    );
  }, [attributes, search]);

  // ===== columns =====
  const columns = [
    {
      title: "Thuộc tính",
      dataIndex: "Name",
      width: "28%",
      ellipsis: true,
      sorter: (a, b) => (a.Name || "").localeCompare(b.Name || ""),
    },
    {
      title: "Giá trị",
      dataIndex: "Value",
      width: "44%",
      render: (text, record) => {
        const isEditing = editingKey === record.ID;
        return isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Nhập giá trị..."
            onPressEnter={() => handleUpdateConfig(record.ID, editValue)}
            autoFocus
          />
        ) : (
          text || (
            <Tag color="default" style={{ opacity: 0.7 }}>
              (Trống)
            </Tag>
          )
        );
      },
    },
    {
      title: "Đơn vị",
      dataIndex: "Unit",
      width: 120,
      align: "center",
      render: (u) => u || "—",
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 180,
      render: (_, record) => {
        const isEditing = editingKey === record.ID;
        return (
          <Space>
            {isEditing ? (
              <>
                <Button
                  type="link"
                  icon={<CheckOutlined />}
                  onClick={() => handleUpdateConfig(record.ID, editValue)}
                />
                <Button
                  type="link"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setEditingKey(null);
                    setEditValue("");
                  }}
                />
              </>
            ) : (
              <>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingKey(record.ID);
                    setEditValue(record.Value || "");
                  }}
                />
                <Popconfirm
                  title="Xác nhận xóa cấu hình này?"
                  onConfirm={() => handleDeleteConfig(record.ID)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button type="link" danger icon={<DeleteOutlined />} />
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
      <div className="flex justify-center items-center h-[60vh]">
        <Spin size="large" tip="Đang tải chi tiết tài sản..." />
      </div>
    );
  }

  if (!asset) {
    return (
      <Card>
        <Empty description="Không tìm thấy thiết bị" />
        <div style={{ marginTop: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="p-4">
      
      <Card
        title={
          <Space wrap>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontWeight: 700 }}>{asset.Name}</span>
            <Tag>{asset.ManageCode}</Tag>
            {statusTag(asset.Status)}
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
        style={{ borderRadius: 12 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Descriptions
              title="Thông tin chung"
              bordered
              size="small"
              column={1}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="Tên thiết bị">
                {asset.Name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Mã nội bộ">
                {asset.ManageCode || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Mã kế toán">
                {asset.AssetCode || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Danh mục">
                {asset.CategoryName || asset.CategoryID || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="ItemMaster">
                {asset.ItemMasterName || asset.ItemMasterID || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Serial">
                {asset.SerialNumber || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {statusTag(asset.Status)}
              </Descriptions.Item>
              <Descriptions.Item label="Số lượng">
                {asset.Quantity ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="QR Code">
                {asset.QRCode || "—"}
              </Descriptions.Item>
            </Descriptions>
          </Col>

          <Col xs={24} lg={12}>
            <Descriptions
              title="Mua sắm & Bảo hành"
              bordered
              size="small"
              column={1}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="Nhà cung cấp">
                {asset.VendorName || asset.VendorID || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày mua">
                {asset.PurchaseDate || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Giá mua">
                {asset.PurchasePrice ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Mã phiếu mua">
                {asset.PurchaseId || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="BH bắt đầu">
                {asset.WarrantyStartDate || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="BH kết thúc">
                {asset.WarrantyEndDate || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Số tháng BH">
                {asset.WarrantyMonth ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Nhân viên">
                {asset.EmployeeName || asset.EmployeeID || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Bộ phận">
                {asset.DepartmentName || asset.SectionID || "—"}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        <Divider orientation="left">Thuộc tính kỹ thuật</Divider>

        <div
          style={{
            marginBottom: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm theo tên/giá trị/đơn vị…"
            allowClear
            style={{ maxWidth: 360 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tag>
            Tổng: {attributes?.length || 0} | Hiển thị:{" "}
            {filteredAttributes?.length || 0}
          </Tag>
        </div>

        <Table
          dataSource={filteredAttributes || []}
          rowKey={(r) => r.ID}
          columns={columns}
          pagination={{ pageSize: 10 }}
          bordered
          size="middle"
        />
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
              placeholder="Chọn thuộc tính (có thể chọn lại để thêm lần 2)"
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
            shouldUpdate={(prev, curr) => prev.AttributeID !== curr.AttributeID}
          >
            {({ getFieldValue }) => {
              const selId = getFieldValue("AttributeID");
              const meta =
                (allAttributes || []).find((x) => x.ID === selId) || {};
              const unit = meta?.MeasurementUnit || meta?.Unit || undefined;
              const placeholder = meta?.Name
                ? `Nhập ${meta.Name}${unit ? ` (${unit})` : ""}`
                : "Nhập giá trị cấu hình";
              return (
                <Form.Item
                  label="Giá trị"
                  name="Value"
                  rules={[{ required: true, message: "Nhập giá trị!" }]}
                >
                  <Input placeholder={placeholder} addonAfter={unit} />
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
                <Input placeholder="VD: Laptop Dell G5 5700" allowClear />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Mã quản lý nội bộ"
                name="ManageCode"
                rules={[{ required: true, message: "Nhập mã quản lý nội bộ" }]}
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
              <Form.Item label="ItemMaster" name="ItemMasterID">
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
              <Form.Item label="Bảo hành bắt đầu" name="WarrantyStartDate">
                <DatePicker
                  format="YYYY-MM-DD"
                  style={{ width: "100%" }}
                  placeholder="Chọn ngày bắt đầu"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Bảo hành kết thúc" name="WarrantyEndDate">
                <DatePicker
                  format="YYYY-MM-DD"
                  style={{ width: "100%" }}
                  placeholder="Chọn ngày kết thúc"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Số tháng bảo hành" name="WarrantyMonth">
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

            {/* ====== Trong Modal Cập nhật Asset ====== */}
            <Col span={12}>
              <Form.Item label="Người sử dụng" name="EmployeeID">
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
              <Form.Item label="Trạng thái" name="Status" initialValue={1}>
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
      
    </div>
  );
};

export default AssetDetailPage;
