import React, { useEffect, useState } from "react";
import {
  Button,
  Table,
  message,
  Popconfirm,
  Space,
  Card,
  Modal,
  Form,
  Input,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Search } = Input;
const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/attribute`;

const AttributePage = () => {
  const [form] = Form.useForm();
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 6 });

  // 🔹 Lấy danh sách thuộc tính
  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/attributeDetail`);
      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : Object.values(res.data?.data || {});
      setAttributes(data);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách thuộc tính");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  // 🔹 Submit form (add / update)
  const onFinish = async (values) => {
    try {
      if (editing) {
        await axios.post(`${API_BASE}/update/${editing.ID}`, values);
        message.success("Cập nhật thành công");
      } else {
        await axios.post(`${API_BASE}/add`, values);
        message.success("Thêm thuộc tính thành công");
      }
      setOpenModal(false);
      form.resetFields();
      setEditing(null);
      fetchAttributes();
    } catch (err) {
      console.error(err);
      message.error("Không thể lưu thuộc tính");
    }
  };

  // 🔹 Xóa
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/delete/${id}`);
      message.success("Đã xóa");
      fetchAttributes();
    } catch (err) {
      console.error(err);
      message.error("Xóa thất bại");
    }
  };

  const columns = [
    {
      title: "Tên thuộc tính",
      dataIndex: "Name",
      key: "Name",
      render: (text) => text,
    },
    {
      title: "Đơn vị đo",
      dataIndex: "MeasurementUnit",
      key: "MeasurementUnit",
      render: (text) => text || <span style={{ color: "#999" }}>—</span>,
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record);
              form.setFieldsValue(record);
              setOpenModal(true);
            }}
          />
          <Popconfirm
            title="Xác nhận xoá?"
            okText="Xóa"
            cancelText="Hủy"
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
      title="Quản lý Thuộc tính (Attribute)"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAttributes}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpenModal(true);
            }}
          >
            Thêm mới
          </Button>
        </Space>
      }
    >
      {/* Bảng dữ liệu */}
      <Table
        rowKey="ID"
        bordered
        columns={columns}
        dataSource={attributes}
        loading={loading}
        pagination={{
          ...pagination,
          total: attributes.length,
          onChange: (page, pageSize) =>
            setPagination({ current: page, pageSize }),
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20"],
        }}
      />

      {/* Modal thêm / sửa */}
      <Modal
        title={editing ? "Cập nhật thuộc tính" : "Thêm thuộc tính mới"}
        open={openModal}
        onCancel={() => {
          setOpenModal(false);
          setEditing(null);
        }}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="Tên thuộc tính"
            name="Name"
            rules={[{ required: true, message: "Vui lòng nhập tên thuộc tính" }]}
          >
            <Input placeholder="VD: RAM, CPU, Kích thước màn hình..." />
          </Form.Item>

          <Form.Item
            label="Đơn vị đo"
            name="MeasurementUnit"
            tooltip="Không bắt buộc (VD: GB, GHz, inch...)"
          >
            <Input placeholder="VD: GB, Hz, inch..." />
          </Form.Item>

          <Form.Item style={{ textAlign: "right" }}>
            <Button onClick={() => setOpenModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>
              {editing ? "Cập nhật" : "Lưu"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AttributePage;
