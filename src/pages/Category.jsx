// src/pages/CategoryPage.jsx
import React, { useEffect, useState } from "react";
import { Table, Button, Space, Popconfirm, message, Card } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import CategoryForm from "../components/form/CategoryForm";

const CategoryPage = () => {
  const API_URL = import.meta.env.VITE_BACKEND_URL;
  // ====== STATE ======
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // ====== API CALLS ======
  // Lấy danh sách danh mục
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/category`);
      const data = (res.data?.data || []).map((item) => ({
        id: item.ID,
        name: item.Name,
        codePrefix: item.CodePrefix,
        maintenanceIntervalHours: item.MaintenanceIntervalHours,
      }));
      setCategories(data);
    } catch (err) {
      console.error("❌ Lỗi khi tải danh mục:", err);
      message.error("Không thể tải danh mục!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 🔹 Đóng form + reset state
  const closeForm = (form) => {
    setOpenForm(false);
    setEditing(null);
    form?.resetFields?.();
  };

  // 🔹 Thêm danh mục
const handleAdd = async (values, form) => {
  try {
    const token = localStorage.getItem("token"); // ✅ lấy token

    const res = await axios.post(
      `${API_URL}/api/category/add`,
      values,
      {
        headers: {
          Authorization: `Bearer ${token}`, // ✅ gửi token qua header
        },
      }
    );

    console.log(res);
    message.success("Thêm danh mục thành công!");
    fetchCategories();
  } catch (err) {
    console.error("❌ Lỗi khi thêm danh mục:", err);
    message.error(err.response?.data?.message || "Không thể thêm danh mục!");
  } finally {
    closeForm(form);
  }
};


  const handleUpdate = async (values, form) => {
    try {
      await axios.post(`${API_URL}/api/category/update/${editing.id}`, {
        id: editing.id,
        ...values,
      });
      message.success("Cập nhật thành công!");
      closeForm(form);
      fetchCategories();
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật:", err);
      message.error(err.response?.data?.message || "Cập nhật thất bại!");
    }
  };

  // 🔹 Xóa danh mục
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/category/delete/${id}`);
      message.success("Xóa danh mục thành công!");
      fetchCategories();
    } catch (err) {
      console.error("❌ Lỗi khi xóa danh mục:", err);
      message.error(err.response?.data?.message || "Không thể xóa danh mục!");
    }
  };

  // ====== TABLE COLUMNS ======
  const columns = [
    { title: "Tên danh mục", dataIndex: "name", key: "name" },
    { title: "Mã danh mục", dataIndex: "codePrefix", key: "codePrefix" },
    {
      title: "Chu kỳ bảo trì (giờ)",
      dataIndex: "maintenanceIntervalHours",
      key: "maintenanceIntervalHours",
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record);
              setOpenForm(true);
            }}
          />
          <Popconfirm
            title="Bạn có chắc muốn xóa danh mục này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ====== RENDER ======
  return (
    <Card title="Quản lý danh mục thiết bị">
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setOpenForm(true);
          }}
        >
          Thêm danh mục
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={categories}
        rowKey="id" 
        loading={loading}
      />

      <CategoryForm
        open={openForm}
        editing={editing}
        onCancel={() => closeForm()}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
      />
    </Card>
  );
};

export default CategoryPage;
