import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  message,
  Card,
  Space,
  Modal,
  Popconfirm,
  Divider,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Option } = Select;

const ItemMasterPage = () => {
  const [form] = Form.useForm();
  const [itemMasters, setItemMasters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [attributes, setAttributes] = useState([]); // thuộc tính theo Category
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [openAssetModal, setOpenAssetModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // 🔹 chỉ-thêm: state filter (giữ UI gọn, không ảnh hưởng bảng)
  const [filters, setFilters] = useState({
    q: "",
    category: undefined,
    manufacturer: undefined,
    manageType: undefined,
    stock: undefined, // 'in' | 'out'
  });

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // ===== Fetchers =====
  const fetchItemMasters = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/items`);
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setItemMasters(data);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách ItemMaster");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/category`);
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setCategories(data);
    } catch {
      message.error("Không thể tải danh mục");
    }
  };

  const fetchManufacturers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/category/manufacturer`);
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setManufacturers(data);
    } catch {
      message.error("Không thể tải nhà sản xuất");
    }
  };

  useEffect(() => {
    fetchItemMasters();
    fetchCategories();
    fetchManufacturers();
  }, []);

  // ===== Category -> Attribute config =====
  const handleCategoryChange = async (categoryID) => {
    if (!categoryID) {
      setAttributes([]);
      return;
    }
    try {
      const res = await axios.get(
        `${API_URL}/api/category/${categoryID}/attribute-config`
      );
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setAttributes(data);
    } catch (err) {
      console.error("Lỗi khi load thuộc tính:", err);
      message.warning("Danh mục này chưa có thuộc tính");
      setAttributes([]);
    }
  };

  // ===== Lấy values thuộc tính của ItemMaster =====
  const loadItemAttributes = async (itemId) => {
    if (!itemId) return {};
    try {
      const res = await axios.get(`${API_URL}/api/items/${itemId}/attribute`);
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      const attrFormValues = {};
      rows.forEach((r) => {
        attrFormValues[`attr_${r.AttributeID}`] = r.Value ?? "";
      });
      return attrFormValues;
    } catch (err) {
      console.error("❌ Lỗi load thuộc tính ItemMaster:", err);
      return {};
    }
  };

  // ===== Submit add/update ItemMaster =====
  const onFinish = async (values) => {
    try {
      // ép AvailableQuantity theo Total - InUse để payload gửi luôn đúng
      const total = Number(values.TotalQuantity || 0);
      const inUse = Number(values.InUseQuantity || 0);
      const computedAvailable = Math.max(total - inUse, 0);

      const attrValues = attributes.map((a) => {
        const id = a.AttributeID || a.ID;
        return {
          AttributeID: id,
          Value: values[`attr_${id}`] || "",
        };
      });

      const payload = {
        ...values,
        AvailableQuantity: computedAvailable,
        Attributes: attrValues,
      };

      if (editingItem) {
        await axios.post(
          `${API_URL}/api/items/update/${editingItem.ID}`,
          payload
        );
        message.success("Cập nhật ItemMaster thành công!");
      } else {
        await axios.post(`${API_URL}/api/items/add`, payload);
        message.success("Thêm ItemMaster thành công!");
      }

      setOpenModal(false);
      form.resetFields();
      setEditingItem(null);
      fetchItemMasters();
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || "Lỗi khi lưu ItemMaster");
    }
  };

  // ===== Delete ItemMaster =====
  const handleDelete = async (id) => {
    try {
      await axios.post(`${API_URL}/api/items/delete/${id}`);
      message.success("Đã xóa ItemMaster!");
      fetchItemMasters();
    } catch {
      message.error("Không thể xóa ItemMaster");
    }
  };

  // ===== Create Asset =====
  const handleAddAsset = async (values) => {
    try {
      if (!selectedItem) {
        message.error("Chưa chọn dòng sản phẩm!");
        return;
      }

      // QUANTITY → chặn tạo thêm asset nếu đã tồn tại
      if (selectedItem.ManageType === "QUANTITY") {
        const checkRes = await axios.get(
          `${API_URL}/api/items/check-itemquantity/${selectedItem.ID}`
        );
        const existingAssets = Array.isArray(checkRes.data?.data)
          ? checkRes.data.data
          : [];

        if (existingAssets.length > 0) {
          message.warning(
            "Dòng sản phẩm này thuộc loại QUANTITY và đã có asset, không thể thêm nữa!"
          );
          return;
        }
      }

      await axios.post(`${API_URL}/api/asset/add`, {
        ...values,
        ItemMasterID: selectedItem.ID,
        CategoryID: selectedItem.CategoryID,
      });

      message.success("✅ Tạo sản phẩm chi tiết thành công!");
      setOpenAssetModal(false);
      fetchItemMasters();
    } catch (err) {
      console.error("❌ Lỗi khi thêm Asset:", err);
      message.error(
        err.response?.data?.message || "Không thể tạo sản phẩm chi tiết"
      );
    }
  };

  // 🔹 chỉ-thêm: lọc client-side — không đụng columns/layout
  const filteredItemMasters = useMemo(() => {
    let list = itemMasters;

    if (filters.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter(
        (it) =>
          (it.Name || "").toLowerCase().includes(q) ||
          (it.ID || "").toLowerCase().includes(q)
      );
    }
    if (filters.category) {
      list = list.filter((it) => it.CategoryID === filters.category);
    }
    if (filters.manufacturer) {
      list = list.filter((it) => it.ManufacturerID === filters.manufacturer);
    }
    if (filters.manageType) {
      list = list.filter((it) => it.ManageType === filters.manageType);
    }
    if (filters.stock === "in") {
      list = list.filter((it) => Number(it.AvailableQuantity || 0) > 0);
    } else if (filters.stock === "out") {
      list = list.filter((it) => Number(it.AvailableQuantity || 0) <= 0);
    }

    return list;
  }, [itemMasters, filters]);

  const resetFilters = () =>
    setFilters({
      q: "",
      category: undefined,
      manufacturer: undefined,
      manageType: undefined,
      stock: undefined,
    });

  // ===== Columns (GIỮ NGUYÊN của bạn) =====
  const columns = [
    { title: "ID", dataIndex: "ID", key: "ID" },
    {
      title: "Danh mục",
      dataIndex: "CategoryID",
      key: "CategoryID",
      render: (id) => categories.find((c) => c.ID === id)?.Name || id || "—",
    },
    {
      title: "Nhà sản xuất",
      dataIndex: "ManufacturerID",
      key: "ManufacturerID",
      render: (id) => manufacturers.find((m) => m.ID === id)?.Name || id || "—",
    },
    { title: "Tên sản phẩm", dataIndex: "Name", key: "Name" },
    { title: "Loại quản lý", dataIndex: "ManageType", key: "ManageType" },
    {
      title: "Tổng SL",
      dataIndex: "TotalQuantity",
      key: "TotalQuantity",
      align: "center",
    },
    {
      title: "Đang dùng",
      dataIndex: "InUseQuantity",
      key: "InUseQuantity",
      align: "center",
    },
    {
      title: "Còn lại",
      dataIndex: "AvailableQuantity",
      key: "AvailableQuantity",
      align: "center",
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedItem(record);
              setOpenAssetModal(true);
            }}
          >
            Tạo chi tiết
          </Button>

          <Button
            icon={<EditOutlined />}
            onClick={async () => {
              try {
                setEditingItem(record);
                form.setFieldsValue(record);
                setOpenModal(true);
                await handleCategoryChange(record.CategoryID);
                const attrFormValues = await loadItemAttributes(record.ID);
                form.setFieldsValue(attrFormValues);
              } catch (err) {
                console.error("❌ Lỗi khi mở Edit:", err);
                message.error("Không thể tải dữ liệu chi tiết thiết bị");
              }
            }}
          />

          <Popconfirm
            title="Bạn có chắc muốn xóa?"
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
      title="Quản lý Dòng thiết bị (ItemMaster)"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchItemMasters}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingItem(null);
              form.resetFields();
              setAttributes([]);
              setOpenModal(true);
            }}
          >
            Thêm mới
          </Button>
        </Space>
      }
    >
      {/* 🔹 chỉ-thêm: Filter bar nhỏ gọn, không đụng bảng */}
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo ID / Tên…"
            value={filters.q}
            onChange={(e) =>
              setFilters((f) => ({ ...f, q: e.target.value }))
            }
            style={{ width: 240 }}
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
            placeholder="Nhà sản xuất"
            value={filters.manufacturer}
            onChange={(v) => setFilters((f) => ({ ...f, manufacturer: v }))}
            style={{ width: 200 }}
          >
            {manufacturers.map((m) => (
              <Option key={m.ID} value={m.ID}>
                {m.Name}
              </Option>
            ))}
          </Select>

          <Select
            allowClear
            placeholder="Loại quản lý"
            value={filters.manageType}
            onChange={(v) => setFilters((f) => ({ ...f, manageType: v }))}
            style={{ width: 160 }}
          >
            <Option value="INDIVIDUAL">INDIVIDUAL</Option>
            <Option value="QUANTITY">QUANTITY</Option>
          </Select>

          <Select
            allowClear
            placeholder="Tồn kho"
            value={filters.stock}
            onChange={(v) => setFilters((f) => ({ ...f, stock: v }))}
            style={{ width: 140 }}
          >
            <Option value="in">Còn hàng</Option>
            <Option value="out">Hết hàng</Option>
          </Select>

          <Button
            icon={<CloseCircleOutlined />}
            onClick={resetFilters}
          >
            Xóa lọc
          </Button>

          <span style={{ opacity: 0.7 }}>
            Hiển thị {filteredItemMasters.length}/{itemMasters.length}
          </span>
        </Space>
      </div>

      <Table
        columns={columns}                 // GIỮ NGUYÊN
        dataSource={filteredItemMasters}  // chỉ thay nguồn dữ liệu đã lọc
        rowKey={(r) => r.ID}
        loading={loading}
        pagination={{ pageSize: 7 }}
      />

      {/* Modal thêm / sửa ItemMaster — GIỮ NGUYÊN */}
      <Modal
        title={editingItem ? "Cập nhật ItemMaster" : "Thêm ItemMaster mới"}
        open={openModal}
        onCancel={() => {
          setOpenModal(false);
          setEditingItem(null);
        }}
        footer={null}
        destroyOnClose
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            TotalQuantity: 0,
            InUseQuantity: 0,
            AvailableQuantity: 0,
          }}
          onValuesChange={(changed, all) => {
            if (
              Object.prototype.hasOwnProperty.call(changed, "TotalQuantity") ||
              Object.prototype.hasOwnProperty.call(changed, "InUseQuantity")
            ) {
              const total = Number(all.TotalQuantity || 0);
              const inUse = Number(all.InUseQuantity || 0);
              form.setFieldsValue({
                AvailableQuantity: Math.max(total - inUse, 0),
              });
            }
          }}
        >
          <Form.Item
            label="Mã Item (ID)"
            name="ID"
            rules={[{ required: true, message: "Vui lòng nhập ID" }]}
          >
            <Input disabled={!!editingItem} placeholder="Ví dụ: L001" />
          </Form.Item>

          <Form.Item
            label="Danh mục"
            name="CategoryID"
            rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
          >
            <Select placeholder="Chọn danh mục" onChange={handleCategoryChange}>
              {categories.map((cat) => (
                <Option key={cat.ID} value={cat.ID}>
                  {cat.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Nhà sản xuất"
            name="ManufacturerID"
            rules={[{ required: false }]}
          >
            <Select placeholder="Chọn nhà sản xuất (có thể bỏ trống)">
              {manufacturers.map((m) => (
                <Option key={m.ID} value={m.ID}>
                  {m.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Tên sản phẩm"
            name="Name"
            rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Loại quản lý"
            name="ManageType"
            rules={[{ required: true, message: "Vui lòng chọn loại quản lý" }]}
          >
            <Select placeholder="Chọn loại quản lý">
              <Option value="INDIVIDUAL">INDIVIDUAL (theo serial)</Option>
              <Option value="QUANTITY">QUANTITY (theo số lượng)</Option>
            </Select>
          </Form.Item>

          {/* Thuộc tính động (IsRequired) */}
          {attributes.length > 0 && (
            <>
              <Divider>Thuộc tính kỹ thuật (bắt buộc)</Divider>
              {attributes
                .filter((attr) => attr.IsRequired === 1 || attr.IsRequired === true)
                .map((attr) => {
                  const name = attr.AttributeName;
                  const unit = attr.MeasurementUnit || "";
                  const attrId = attr.AttributeID || attr.ID;

                  return (
                    <Form.Item
                      key={attrId}
                      label={`${name}${unit ? ` (${unit})` : ""}`}
                      name={`attr_${attrId}`}
                      rules={[{ required: true, message: `Vui lòng nhập ${name}` }]}
                    >
                      <Input placeholder={`Nhập ${name}`} />
                    </Form.Item>
                  );
                })}
            </>
          )}

          <Form.Item style={{ textAlign: "right" }}>
            <Button onClick={() => setOpenModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>
              {editingItem ? "Cập nhật" : "Lưu"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal tạo Asset — GIỮ NGUYÊN */}
      <Modal
        title={`Tạo sản phẩm chi tiết cho: ${selectedItem?.Name || ""}`}
        open={openAssetModal}
        onCancel={() => {
          setOpenAssetModal(false);
          setSelectedItem(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          onFinish={handleAddAsset}
          initialValues={{
            Quantity: selectedItem?.ManageType === "INDIVIDUAL" ? 1 : 1,
            Status: 1,
          }}
        >
          <Form.Item
            label="Mã quản lý nội bộ (ManageCode)"
            name="ManageCode"
            rules={[{ required: true, message: "Vui lòng nhập mã quản lý nội bộ" }]}
          >
            <Input placeholder="VD: IT123" />
          </Form.Item>

          <Form.Item label="Mã tài sản kế toán (AssetCode)" name="AssetCode">
            <Input placeholder="VD: B123" />
          </Form.Item>

          <Form.Item label="Tên hiển thị thiết bị" name="Name">
            <Input placeholder="VD: Laptop Dell i5" />
          </Form.Item>

          <Form.Item label="Ngày mua" name="PurchaseDate">
            <Input type="date" />
          </Form.Item>

          <Form.Item label="Giá mua" name="PurchasePrice">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          {selectedItem?.ManageType === "INDIVIDUAL" ? (
            <>
              <Form.Item
                label="Số serial"
                name="SerialNumber"
                rules={[{ required: true, message: "Vui lòng nhập số serial" }]}
              >
                <Input placeholder="VD: SN12345" />
              </Form.Item>
              <Form.Item name="Quantity" hidden initialValue={1}>
                <InputNumber />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              label="Số lượng"
              name="Quantity"
              rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          )}

          <Form.Item label="Trạng thái" name="Status">
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
            <Button onClick={() => setOpenAssetModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>
              Lưu
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ItemMasterPage;
