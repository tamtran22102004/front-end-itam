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
  Descriptions,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Option } = Select;

const ItemMasterPage = () => {
  const [form] = Form.useForm();
  const [itemMasters, setItemMasters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // ✅ Fetch ItemMaster
  const fetchItemMasters = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/items`);
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.data || [];
      setItemMasters(data);
    } catch (error) {
      message.error("Không thể tải danh sách ItemMaster");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Category
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/category`);
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.data || [];
      setCategories(data);
    } catch {
      message.error("Không thể tải danh mục");
    }
  };

  // ✅ Fetch Manufacturer
  const fetchManufacturers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/category/manufacturer`);
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.data || [];
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

  // ✅ Submit form (add hoặc update)
  const onFinish = async (values) => {
    try {
      if (editingItem) {
        await axios.post(`${API_URL}/api/items/update/${editingItem.ID}`, values);
        message.success("Cập nhật ItemMaster thành công!");
      } else {
        await axios.post(`${API_URL}/api/items/add`, values);
        message.success("Thêm ItemMaster thành công!");
      }
      setOpenModal(false);
      form.resetFields();
      setEditingItem(null);
      fetchItemMasters();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi khi lưu ItemMaster");
    }
  };

  // ✅ Xóa Item
  const handleDelete = async (id) => {
    try {
      await axios.post(`${API_URL}/api/items/delete/${id}`);
      message.success("Đã xóa ItemMaster!");
      fetchItemMasters();
    } catch {
      message.error("Không thể xóa ItemMaster");
    }
  };

  // ✅ Hiển thị thông tin chi tiết
  const showDetail = (record) => {
    setDetailItem(record);
  };

  // ✅ Cột bảng
  const columns = [
    { title: "ID", dataIndex: "ID", key: "ID" },
    {
      title: "Danh mục",
      dataIndex: "CategoryID",
      key: "CategoryID",
      render: (id) => {
        const cat = categories.find((c) => c.ID === id || c.id === id);
        return cat ? cat.Name || cat.name : id || "—";
      },
    },
    {
      title: "Nhà sản xuất",
      dataIndex: "ManufacturerID",
      key: "ManufacturerID",
      render: (id) => {
        const manu = manufacturers.find((m) => m.ID === id || m.id === id);
        return manu ? manu.Name || manu.name : id || "—";
      },
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
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingItem(record);
              setOpenModal(true);
              form.setFieldsValue(record);
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
      title="Quản lý ItemMaster"
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
              setOpenModal(true);
            }}
          >
            Thêm mới
          </Button>
        </Space>
      }
    >
      {/* ✅ Bảng dữ liệu */}
      <Table
        columns={columns}
        dataSource={itemMasters}
        rowKey={(r) => r.ID || r.id}
        loading={loading}
        pagination={{ pageSize: 6 }}
      />

      {/* ✅ Modal thêm / sửa */}
      <Modal
        title={editingItem ? "Cập nhật ItemMaster" : "Thêm ItemMaster mới"}
        open={openModal}
        onCancel={() => {
          setOpenModal(false);
          setEditingItem(null);
        }}
        footer={null}
        destroyOnClose
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
            <Select placeholder="Chọn danh mục">
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

          {/* <Form.Item label="Số lượng" name="Quantity">
            <InputNumber min={0} style={{ width: "100%" }}disabled={!!editingItem} placeholder="Ví dụ: L001" />

          </Form.Item> */}

          <Form.Item style={{ textAlign: "right" }}>
            <Button htmlType="button" onClick={() => setOpenModal(false)}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ marginLeft: 8 }}
            >
              {editingItem ? "Cập nhật" : "Lưu"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* ✅ Modal xem chi tiết */}
      <Modal
        title="Chi tiết ItemMaster"
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        footer={[
          <Button key="close" onClick={() => setDetailItem(null)}>
            Đóng
          </Button>,
        ]}
      >
        {detailItem && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">{detailItem.ID}</Descriptions.Item>
            <Descriptions.Item label="Tên sản phẩm">
              {detailItem.Name}
            </Descriptions.Item>
            <Descriptions.Item label="Danh mục">
              {
                categories.find((c) => c.ID === detailItem.CategoryID)?.Name ||
                "—"
              }
            </Descriptions.Item>
            <Descriptions.Item label="Nhà sản xuất">
              {
                manufacturers.find(
                  (m) => m.ID === detailItem.ManufacturerID
                )?.Name || "—"
              }
            </Descriptions.Item>
            <Descriptions.Item label="Loại quản lý">
              {detailItem.ManageType}
            </Descriptions.Item>
            <Descriptions.Item label="Số lượng">
              {detailItem.Quantity}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default ItemMasterPage;
