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
  Tag,
  Badge,
  Divider,
  Tooltip,
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
import isBetween from "dayjs/plugin/isBetween";
import { useNavigate } from "react-router-dom";

dayjs.extend(isBetween);

const { Option } = Select;
const { RangePicker } = DatePicker;

const STATUS_MAP = {
  1: { text: "Sẵn sàng", color: "green" },
  2: { text: "Đang dùng", color: "blue" },
  3: { text: "Bảo hành", color: "gold" },
  4: { text: "Sửa chữa", color: "orange" },
  5: { text: "Hủy", color: "default" },
  6: { text: "Thanh lý", color: "red" },
};

const fmtMoney = (v) =>
  typeof v === "number" ? v.toLocaleString("vi-VN") : v ? String(v) : "—";
const fmtDate = (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—");
const isWarrantyActive = (start, end) => {
  if (!start || !end) return false;
  const s = dayjs(start);
  const e = dayjs(end);
  const now = dayjs();
  return now.isAfter(s) && now.isBefore(e) || now.isSame(s, "day") || now.isSame(e, "day");
};

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

  // Filters
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

  // ======= Lookup maps để render nhanh
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.ID, c.Name])),
    [categories]
  );
  const imMap = useMemo(
    () => Object.fromEntries(itemMasters.map((i) => [i.ID, i.Name])),
    [itemMasters]
  );
  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.ID, v.Name])),
    [vendors]
  );
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

  // ===================== Filtered list =====================
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

    if (filters.category) list = list.filter((it) => it.CategoryID === filters.category);
    if (filters.itemMaster) list = list.filter((it) => it.ItemMasterID === filters.itemMaster);
    if (filters.vendor) list = list.filter((it) => it.VendorID === filters.vendor);
    if (filters.status !== undefined && filters.status !== null)
      list = list.filter((it) => Number(it.Status) === Number(filters.status));

    // Range mua hàng (nhận cả 'YYYY-MM-DD HH:mm:ss')
    if (Array.isArray(filters.purchaseRange) && filters.purchaseRange.length === 2) {
      const [start, end] = filters.purchaseRange;
      if (start && end) {
        list = list.filter((it) => {
          if (!it.PurchaseDate) return false;
          const d = dayjs(it.PurchaseDate); // không strict
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
    {
      title: "Tên thiết bị",
      dataIndex: "Name",
      key: "Name",
      width: 220,
      ellipsis: true,
      render: (text, rec) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>{text || "—"}</span>
          <span style={{ color: "#777", fontSize: 12 }}>
            {rec.ManageCode || "—"} • {rec.AssetCode || "—"} • SN: {rec.SerialNumber || "—"}
          </span>
        </div>
      ),
    },
    {
      title: "Danh mục / Model",
      key: "CatModel",
      width: 220,
      render: (_, r) => (
        <div>
          <div>{catMap[r.CategoryID] || "—"}</div>
          <div style={{ color: "#777", fontSize: 12 }}>{imMap[r.ItemMasterID] || "—"}</div>
        </div>
      ),
    },
    {
      title: "Vendor",
      dataIndex: "VendorID",
      key: "VendorID",
      width: 160,
      render: (id) => vendorMap[id] || "—",
    },
    {
      title: "BH",
      key: "Warranty",
      width: 120,
      render: (_, r) => {
        const active = isWarrantyActive(r.WarrantyStartDate, r.WarrantyEndDate);
        return active ? <Tag color="green">Đang BH</Tag> : <Tag>Hết/không BH</Tag>;
      },
    },
    {
      title: "Ngày mua",
      dataIndex: "PurchaseDate",
      key: "PurchaseDate",
      width: 120,
      render: (v) => fmtDate(v),
    },
    {
      title: "Giá mua",
      dataIndex: "PurchasePrice",
      key: "PurchasePrice",
      width: 120,
      align: "right",
      render: (v) => fmtMoney(v),
    },
    {
      title: "Qty",
      dataIndex: "Quantity",
      key: "Quantity",
      width: 80,
      align: "center",
      render: (v) => <Tag>{v ?? "—"}</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      key: "Status",
      width: 130,
      render: (s) => {
        const m = STATUS_MAP[s] || { text: "Không rõ", color: "default" };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: "Khác",
      key: "Other",
      width: 140,
      render: (r) => (
        <Space size={4} wrap>
          {r.QRCode ? <Tag bordered={false}>{r.QRCode}</Tag> : null}
          {getIMById(r.ItemMasterID)?.ManageType ? (
            <Tag color="purple">{getIMById(r.ItemMasterID).ManageType}</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right",
      width: 132,
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button icon={<EyeOutlined />} onClick={() => navigate(`/assetdetail/${record.ID}`)} />
          </Tooltip>

          <Tooltip title="Chỉnh sửa">
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                const recordWithDayjs = {
                  ...record,
                  PurchaseDate: record.PurchaseDate ? dayjs(record.PurchaseDate) : null,
                  WarrantyStartDate: record.WarrantyStartDate ? dayjs(record.WarrantyStartDate) : null,
                  WarrantyEndDate: record.WarrantyEndDate ? dayjs(record.WarrantyEndDate) : null,
                };

                setEditingAsset(record);
                form.setFieldsValue(recordWithDayjs);

                const im = getIMById(record.ItemMasterID);
                setCurrentManageType(im?.ManageType || null);

                setOpenModal(true);
              }}
            />
          </Tooltip>

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
      bodyStyle={{ padding: 14 }}
      style={{ borderRadius: 10 }}
    >
      {/* Thanh filter compact */}
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
            optionFilterProp="children"
            showSearch
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
            optionFilterProp="children"
            showSearch
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
            optionFilterProp="children"
            showSearch
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
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <Option key={k} value={Number(k)}>
                {v.text}
              </Option>
            ))}
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
        dataSource={filteredAssets}
        rowKey={(r) => r.ID}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 1200 }}
        size="middle"
        tableLayout="auto"
        onRow={(record) => ({
          onDoubleClick: () => navigate(`/assetdetail/${record.ID}`),
          style: { cursor: "pointer" },
        })}
        bordered
      />

      {/* Modal thêm/sửa (layout 2 cột, validator ngày BH) */}
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
        width={760}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ Quantity: 1, Status: 1 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
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
              <Select showSearch allowClear placeholder="Chọn danh mục" optionFilterProp="children">
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
              <Select showSearch allowClear placeholder="Chọn Vendor" optionFilterProp="children">
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

            <Form.Item
              label="Ngày kết thúc bảo hành"
              name="WarrantyEndDate"
              dependencies={["WarrantyStartDate"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const start = getFieldValue("WarrantyStartDate");
                    if (!value || !start) return Promise.resolve();
                    if (dayjs(value).isBefore(dayjs(start), "day"))
                      return Promise.reject(new Error("EndDate phải ≥ StartDate"));
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item label="Tổng tháng bảo hành" name="WarrantyMonth">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>

            {/* Phần động theo ManageType hiện tại */}
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.ItemMasterID !== curr.ItemMasterID || prev.Quantity !== curr.Quantity}
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
                      label={
                        <Space>
                          SerialNumber
                          {manageType === "INDIVIDUAL" && <Tag color="purple">INDIVIDUAL</Tag>}
                        </Space>
                      }
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
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <Option key={k} value={Number(k)}>
                    {v.text}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
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
