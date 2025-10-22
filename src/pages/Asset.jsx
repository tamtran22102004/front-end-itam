import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Space,
  Card,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const { RangePicker } = DatePicker;

const AssetPage = () => {
  const navigate = useNavigate();

  const [form] = Form.useForm();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [itemMasters, setItemMasters] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // ManageType hiện tại của form (suy ra từ ItemMasterID)
  const [currentManageType, setCurrentManageType] = useState(null);

  // ✅ chỉ-thêm: state filters cho thanh lọc
  const [filters, setFilters] = useState({
    q: "",
    category: undefined,
    itemMaster: undefined,
    vendor: undefined,
    status: undefined,
    purchaseRange: [], // [dayjs, dayjs]
  });

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // ===================== Fetchers =====================
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/asset`);
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setAssets(data);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách tài sản");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/category`);
      setCategories(res.data.data || []);
    } catch {
      message.error("Không thể tải danh mục");
    }
  };

  const fetchItemMasters = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/items`);
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setItemMasters(data);
    } catch {
      message.error("Không thể tải ItemMaster");
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vendor`);
      setVendors(res.data.data || []);
    } catch {
      message.error("Không thể tải nhà cung cấp");
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchCategories();
    fetchItemMasters();
    fetchVendors();
  }, []);

  // ===================== Helpers =====================
  const getIMById = (id) => itemMasters.find((i) => i.ID === id);

  // Khi chọn ItemMaster -> set CategoryID + xác định ManageType + ép Quantity nếu cần
  const handleItemMasterChange = (id) => {
    const im = getIMById(id);
    if (im) {
      if (im.CategoryID) {
        form.setFieldsValue({ CategoryID: im.CategoryID });
      }
      setCurrentManageType(im.ManageType || null);
      if (im.ManageType === "INDIVIDUAL") {
        form.setFieldsValue({ Quantity: 1 });
      }
    } else {
      setCurrentManageType(null);
    }
    form.setFieldsValue({ ItemMasterID: id });
  };

  // ===================== Submit form =====================
  const onFinish = async (values) => {
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
        await axios.post(
          `${API_URL}/api/asset/update/${editingAsset.ID}`,
          payload
        );
        message.success("Cập nhật Asset thành công!");
      } else {
        await axios.post(`${API_URL}/api/asset/add`, payload);
        message.success("Thêm Asset thành công!");
      }

      setOpenModal(false);
      form.resetFields();
      setCurrentManageType(null);
      setEditingAsset(null);
      fetchAssets();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Lỗi khi lưu Asset");
    }
  };

  // ===================== Delete =====================
  const handleDelete = async (id) => {
    try {
      await axios.post(`${API_URL}/api/asset/delete/${id}`);
      message.success("Xóa tài sản thành công!");
      fetchAssets();
    } catch {
      message.error("Không thể xóa tài sản");
    }
  };

  // ===================== Filtered list (GIỮ NGUYÊN bảng, chỉ lọc dataSource) =====================
  const filteredAssets = useMemo(() => {
    let list = assets;

    // text search theo nhiều trường
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

    if (filters.category) {
      list = list.filter((it) => it.CategoryID === filters.category);
    }
    if (filters.itemMaster) {
      list = list.filter((it) => it.ItemMasterID === filters.itemMaster);
    }
    if (filters.vendor) {
      list = list.filter((it) => it.VendorID === filters.vendor);
    }
    if (filters.status !== undefined && filters.status !== null) {
      list = list.filter((it) => Number(it.Status) === Number(filters.status));
    }

    if (Array.isArray(filters.purchaseRange) && filters.purchaseRange.length === 2) {
      const [start, end] = filters.purchaseRange;
      if (start && end) {
        list = list.filter((it) => {
          if (!it.PurchaseDate) return false;
          const d = dayjs(it.PurchaseDate, "YYYY-MM-DD", true);
          return d.isValid() && d.isBetween(start.startOf("day"), end.endOf("day"), null, "[]");
        });
      }
    }

    return list;
  }, [assets, filters]);

  const resetFilters = () =>
    setFilters({
      q: "",
      category: undefined,
      itemMaster: undefined,
      vendor: undefined,
      status: undefined,
      purchaseRange: [],
    });

  // ===================== Columns =====================
  const columns = [
    { title: "ID", dataIndex: "ID", key: "ID", width: 200 },
    { title: "Tên thiết bị", dataIndex: "Name", key: "Name", width: 180 },
    { title: "Mã nội bộ", dataIndex: "ManageCode", key: "ManageCode" },
    { title: "Mã kế toán", dataIndex: "AssetCode", key: "AssetCode" },
    {
      title: "Danh mục",
      dataIndex: "CategoryID",
      key: "CategoryID",
      render: (id) => categories.find((c) => c.ID === id)?.Name || "—",
    },
    {
      title: "ItemMaster",
      dataIndex: "ItemMasterID",
      key: "ItemMasterID",
      render: (id) => itemMasters.find((i) => i.ID === id)?.Name || "—",
    },
    {
      title: "Nhà cung cấp",
      dataIndex: "VendorID",
      key: "VendorID",
      render: (id) => vendors.find((v) => v.ID === id)?.Name || "—",
    },
    { title: "Ngày mua", dataIndex: "PurchaseDate", key: "PurchaseDate" },
    { title: "Giá mua", dataIndex: "PurchasePrice", key: "PurchasePrice" },
    { title: "Mã phiếu mua", dataIndex: "PurchaseId", key: "PurchaseId" },
    {
      title: "Bắt đầu BH",
      dataIndex: "WarrantyStartDate",
      key: "WarrantyStartDate",
    },
    {
      title: "Kết thúc BH",
      dataIndex: "WarrantyEndDate",
      key: "WarrantyEndDate",
    },
    { title: "Số tháng BH", dataIndex: "WarrantyMonth", key: "WarrantyMonth" },
    { title: "SerialNumber", dataIndex: "SerialNumber", key: "SerialNumber" },
    { title: "EmployeeID", dataIndex: "EmployeeID", key: "EmployeeID" },
    { title: "SectionID", dataIndex: "SectionID", key: "SectionID" },
    { title: "Số lượng", dataIndex: "Quantity", key: "Quantity" },
    { title: "QR Code", dataIndex: "QRCode", key: "QRCode" },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      key: "Status",
      render: (s) =>
        ({
          1: "Sẵn sàng",
          2: "Đang dùng",
          3: "Bảo hành",
          4: "Sửa chữa",
          5: "Hủy",
          6: "Thanh lý",
        }[s] || "Không rõ"),
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/assetdetail/${record.ID}`)}
          />

          <Button
            icon={<EditOutlined />}
            onClick={() => {
              const recordWithDayjs = {
                ...record,
                PurchaseDate: record.PurchaseDate
                  ? dayjs(record.PurchaseDate)
                  : null,
                WarrantyStartDate: record.WarrantyStartDate
                  ? dayjs(record.WarrantyStartDate)
                  : null,
                WarrantyEndDate: record.WarrantyEndDate
                  ? dayjs(record.WarrantyEndDate)
                  : null,
              };

              setEditingAsset(record);
              form.setFieldsValue(recordWithDayjs);

              const im = getIMById(record.ItemMasterID);
              setCurrentManageType(im?.ManageType || null);

              setOpenModal(true);
            }}
          />

          <Popconfirm
            title="Bạn có chắc muốn xóa tài sản này?"
            onConfirm={() => handleDelete(record.ID)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Quản lý Tài sản (Asset)"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAssets}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAsset(null);
              setCurrentManageType(null);
              form.resetFields();
              form.setFieldsValue({ Quantity: 1, Status: 1 });
              setOpenModal(true);
            }}
          >
            Thêm mới
          </Button>
        </Space>
      }
    >
      {/* ✅ Thanh filter gọn, không ảnh hưởng layout bảng */}
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo Tên / Mã nội bộ / Mã kế toán / Serial…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            style={{ width: 320 }}
          />

          <Select
            allowClear
            placeholder="Danh mục"
            value={filters.category}
            onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            style={{ width: 200 }}
          >
            {categories.map((c) => (
              <Option key={c.ID} value={c.ID}>
                {c.Name}
              </Option>
            ))}
          </Select>

          <Select
            allowClear
            placeholder="ItemMaster"
            value={filters.itemMaster}
            onChange={(v) => setFilters((f) => ({ ...f, itemMaster: v }))}
            style={{ width: 220 }}
          >
            {itemMasters.map((i) => (
              <Option key={i.ID} value={i.ID}>
                {i.Name}
              </Option>
            ))}
          </Select>

          <Select
            allowClear
            placeholder="Vendor"
            value={filters.vendor}
            onChange={(v) => setFilters((f) => ({ ...f, vendor: v }))}
            style={{ width: 200 }}
          >
            {vendors.map((v) => (
              <Option key={v.ID} value={v.ID}>
                {v.Name}
              </Option>
            ))}
          </Select>

          <Select
            allowClear
            placeholder="Trạng thái"
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            style={{ width: 160 }}
          >
            <Option value={1}>Sẵn sàng</Option>
            <Option value={2}>Đang dùng</Option>
            <Option value={3}>Bảo hành</Option>
            <Option value={4}>Sửa chữa</Option>
            <Option value={5}>Hủy</Option>
            <Option value={6}>Thanh lý</Option>
          </Select>

          <RangePicker
            value={filters.purchaseRange}
            onChange={(v) => setFilters((f) => ({ ...f, purchaseRange: v || [] }))}
            placeholder={["Ngày mua từ", "đến"]}
          />

          <Button icon={<CloseCircleOutlined />} onClick={resetFilters}>
            Xóa lọc
          </Button>

          <span style={{ opacity: 0.7 }}>
            Hiển thị {filteredAssets.length}/{assets.length}
          </span>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredAssets}  // ✅ chỉ thay nguồn dữ liệu đã lọc
        rowKey={(r) => r.ID}
        loading={loading}
        pagination={{ pageSize: 8 }}
        scroll={{ x: "max-content" }}
        tableLayout="auto"
        bordered
        size="middle"
      />

      {/* Modal thêm/sửa (GIỮ NGUYÊN) */}
      <Modal
        title={editingAsset ? "Cập nhật Asset" : "Thêm Asset mới"}
        open={openModal}
        onCancel={() => {
          setOpenModal(false);
          setCurrentManageType(null);
          setEditingAsset(null);
        }}
        footer={null}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Tên thiết bị"
            name="Name"
            rules={[{ required: true, message: "Nhập tên thiết bị" }]}
          >
            <Input allowClear />
          </Form.Item>

          <Form.Item
            label="Mã quản lý nội bộ"
            name="ManageCode"
            rules={[{ required: true, message: "Nhập mã quản lý nội bộ" }]}
          >
            <Input allowClear />
          </Form.Item>

          <Form.Item label="Mã tài sản kế toán" name="AssetCode">
            <Input allowClear />
          </Form.Item>

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

          <Form.Item label="Thuộc dòng ItemMaster" name="ItemMasterID">
            <Select
              showSearch
              allowClear
              placeholder="Chọn ItemMaster"
              optionFilterProp="children"
              onChange={handleItemMasterChange}
            >
              {itemMasters.map((i) => (
                <Option key={i.ID} value={i.ID}>
                  {i.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

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

          <Form.Item label="Ngày mua" name="PurchaseDate">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Giá mua" name="PurchasePrice">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Mã phiếu mua" name="PurchaseId">
            <Input allowClear />
          </Form.Item>

          <Form.Item label="Ngày bảo hành bắt đầu" name="WarrantyStartDate">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Ngày kết thúc bảo hành" name="WarrantyEndDate">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Tổng tháng bảo hành" name="WarrantyMonth">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          {/* Phần động theo ManageType hiện tại */}
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.ItemMasterID !== curr.ItemMasterID}
          >
            {({ getFieldValue, setFieldsValue }) => {
              const im = getIMById(getFieldValue("ItemMasterID"));
              const manageType = im?.ManageType || currentManageType || null;

              if (manageType === "INDIVIDUAL" && getFieldValue("Quantity") !== 1) {
                setFieldsValue({ Quantity: 1 });
              }

              return (
                <>
                  <Form.Item
                    label="SerialNumber"
                    name="SerialNumber"
                    rules={
                      manageType === "INDIVIDUAL"
                        ? [{ required: true, message: "Nhập SerialNumber cho thiết bị INDIVIDUAL" }]
                        : []
                    }
                  >
                    <Input allowClear placeholder="VD: SN12345" />
                  </Form.Item>

                  {manageType === "INDIVIDUAL" ? (
                    <Form.Item label="Số lượng" name="Quantity" initialValue={1}>
                      <InputNumber min={1} style={{ width: "100%" }} disabled />
                    </Form.Item>
                  ) : (
                    <Form.Item label="Số lượng" name="Quantity" initialValue={1}>
                      <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>
                  )}
                </>
              );
            }}
          </Form.Item>

          <Form.Item label="QR Code" name="QRCode">
            <Input allowClear />
          </Form.Item>

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

          <Form.Item style={{ textAlign: "right" }}>
            <Button onClick={() => setOpenModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>
              {editingAsset ? "Cập nhật" : "Lưu"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AssetPage;
