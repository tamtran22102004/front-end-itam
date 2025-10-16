import React, { useState, useEffect } from "react";
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

  // Modal Asset
  const [openAssetModal, setOpenAssetModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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

  // ===== Function riêng: lấy values thuộc tính của ItemMaster =====
  const loadItemAttributes = async (itemId) => {
    if (!itemId) {
      console.warn("⚠️ Không có ID ItemMaster khi gọi loadItemAttributes");
      return {};
    }
    try {
      // API theo yêu cầu: {API_URL}/items/:id/attribute
      const res = await axios.get(`${API_URL}/api/items/${itemId}/attribute`);
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];

      // Map thành { attr_1: 'i9...', attr_2: '32GB', ... }
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
      const attrValues = attributes.map((a) => {
        const id = a.AttributeID || a.ID;
        return {
          AttributeID: id,
          Value: values[`attr_${id}`] || "",
        };
      });

      const payload = {
        ...values,
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
      await axios.post(`${API_URL}/api/items/asset/add`, {
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

  // ===== Columns =====
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
    { title: "Số lượng", dataIndex: "Quantity", key: "Quantity" },
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

          {/* Sửa: mở modal, load attribute config + load attribute values */}
          <Button
            icon={<EditOutlined />}
            onClick={async () => {
              try {
                setEditingItem(record);
                form.setFieldsValue(record);

                // 1) Mở modal trước để form hiện ngay
                setOpenModal(true);

                // 2) Load attribute-config theo Category
                await handleCategoryChange(record.CategoryID);

                // 3) Lấy giá trị thuộc tính đã lưu và đổ vào form
                const attrFormValues = await loadItemAttributes(
                  record.ID || record.id
                );
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
      <Table
        columns={columns}
        dataSource={itemMasters}
        rowKey={(r) => r.ID}
        loading={loading}
        pagination={{ pageSize: 7 }}
      />

      {/* Modal thêm / sửa ItemMaster */}
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
          initialValues={{ Quantity: 0 }}
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
            rules={[{ required: true, message: "Vui lòng chọn nhà sản xuất" }]}
          >
            <Select placeholder="Chọn nhà sản xuất">
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

          {/* Thuộc tính động */}
          {attributes.length > 0 && (
            <>
              <Divider>Thuộc tính kỹ thuật (bắt buộc)</Divider>
              {attributes
                .filter(
                  (attr) => attr.IsRequired === 1 || attr.IsRequired === true
                ) // 👈 chỉ lấy IsRequired = 1
                .map((attr) => {
                  const name = attr.AttributeName;
                  const unit = attr.MeasurementUnit || "";
                  const attrId = attr.AttributeID || attr.ID;

                  return (
                    <Form.Item
                      key={attrId}
                      label={`${name}${unit ? ` (${unit})` : ""}`}
                      name={`attr_${attrId}`}
                      rules={[
                        { required: true, message: `Vui lòng nhập ${name}` },
                      ]}
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

      {/* Modal tạo Asset */}
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
            Quantity: selectedItem?.ManageType === "INDIVIDUAL" ? 1 : 1, // mặc định 1
            Status: 1,
          }}
        >
          <Form.Item
            label="Mã quản lý nội bộ (ManageCode)"
            name="ManageCode"
            rules={[
              { required: true, message: "Vui lòng nhập mã quản lý nội bộ" },
            ]}
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

          {/* Nếu ManageType là INDIVIDUAL → chỉ hiển thị Serial, Quantity mặc định 1 */}
          {selectedItem?.ManageType === "INDIVIDUAL" ? (
            <>
              <Form.Item
                label="Số serial"
                name="SerialNumber"
                rules={[{ required: true, message: "Vui lòng nhập số serial" }]}
              >
                <Input placeholder="VD: SN12345" />
              </Form.Item>

              {/* Quantity hidden */}
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
