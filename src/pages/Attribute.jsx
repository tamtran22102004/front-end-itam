import React, { useEffect, useState } from "react";
import { Button, Table, message, Popconfirm, Space, Card } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import axios from "axios";
import AttributeForm from "../components/form/AttributeForm";
import "../styles/attribute.css";

const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/attribute`;

const AttributePage = () => {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 6,
  });

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

  // 🔹 Mở Modal (thêm/sửa)
  const openModal = (record = null) => {
    setEditing(record);
    setIsModalOpen(true);
  };

  // 🔹 Đóng Modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  // 🔹 Thêm mới
  const handleAdd = async (values, form) => {
    try {
      await axios.post(`${API_BASE}/add`, values);
      console.log(values);
      message.success("Thêm thành công");
      closeModal();
      form.resetFields();
      fetchAttributes();
    } catch (err) {
      console.error(err);
      message.error("Thêm thất bại");
    }
  };

  // 🔹 Cập nhật
  const handleUpdate = async (values, form) => {
    try {
      await axios.post(`${API_BASE}/update/${editing.ID}`, {
        id: editing.ID,
        ...values,
      });
      message.success("Cập nhật thành công");
      closeModal();
      form.resetFields();
      fetchAttributes();
    } catch (err) {
      console.error(err);
      message.error("Cập nhật thất bại");
    }
  };

  // 🔹 Xóa
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/delete/${id}`);
      message.success("Đã xóa");
      setAttributes((prev) => prev.filter((a) => a.ID !== id));
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
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Đơn vị đo",
      dataIndex: "MeasurementUnit",
      key: "MeasurementUnit",
      render: (text) => text || <span style={{ color: "#999" }}>—</span>,
    },
    {
      title: "Sửa / Xóa",
      key: "actions",
      align: "center",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)} />
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
    <div className="attribute-container">
      <Card bordered={false} className="attribute-card">
        <div className="attribute-header">
          <h2>Quản lý thuộc tính</h2>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAttributes}
              style={{ borderRadius: 8 }}
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
              style={{ borderRadius: 8 }}
            >
              Thêm thuộc tính
            </Button>
          </Space>
        </div>

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
      </Card>

      {/* Form riêng */}
      <AttributeForm
        open={isModalOpen}
        editing={editing}
        onCancel={closeModal}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
      />
    </div>
  );
};

export default AttributePage;
