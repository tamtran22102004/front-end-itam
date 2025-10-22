// src/pages/CategoryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Card,
  Input,
  InputNumber,
  Select,
  Tag,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import axios from "axios";
import CategoryForm from "../components/form/CategoryForm";

const { Option } = Select;

const CategoryPage = () => {
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // ====== STATE ======
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Filters (client-side)
  const [kw, setKw] = useState("");            // từ khóa: name hoặc code
  const [minHours, setMinHours] = useState();  // lọc min chu kỳ bảo trì
  const [maxHours, setMaxHours] = useState();  // lọc max chu kỳ bảo trì
  const [sortField, setSortField] = useState("name"); // name | hours
  const [sortOrder, setSortOrder] = useState("asc");  // asc | desc
  const [pageSize, setPageSize] = useState(8);

  // ====== API CALLS ======
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
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/category/add`, values, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Thêm danh mục thành công!");
      fetchCategories();
    } catch (err) {
      console.error("❌ Lỗi khi thêm danh mục:", err);
      message.error(err.response?.data?.message || "Không thể thêm danh mục!");
    } finally {
      closeForm(form);
    }
  };

  // 🔹 Cập nhật
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

  // ====== FILTERED + SORTED DATA ======
  const dataView = useMemo(() => {
    let list = [...categories];

    const q = kw.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(q) ||
          (r.codePrefix || "").toLowerCase().includes(q)
      );
    }

    const toNum = (v) =>
      v === null || v === undefined || v === "" ? NaN : Number(v);

    const minN = toNum(minHours);
    const maxN = toNum(maxHours);

    if (!Number.isNaN(minN)) {
      list = list.filter((r) => {
        const v = toNum(r.maintenanceIntervalHours);
        return !Number.isNaN(v) && v >= minN;
      });
    }
    if (!Number.isNaN(maxN)) {
      list = list.filter((r) => {
        const v = toNum(r.maintenanceIntervalHours);
        return !Number.isNaN(v) && v <= maxN;
      });
    }

    if (sortField === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      // sort by hours (null/NaN đẩy xuống cuối)
      list.sort((a, b) => {
        const av = toNum(a.maintenanceIntervalHours);
        const bv = toNum(b.maintenanceIntervalHours);
        if (Number.isNaN(av) && Number.isNaN(bv)) return 0;
        if (Number.isNaN(av)) return 1;
        if (Number.isNaN(bv)) return -1;
        return av - bv;
      });
    }

    if (sortOrder === "desc") list.reverse();
    return list;
  }, [categories, kw, minHours, maxHours, sortField, sortOrder]);

  // ====== TABLE COLUMNS ======
  const columns = [
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Mã danh mục",
      dataIndex: "codePrefix",
      key: "codePrefix",
      width: 180,
      render: (v) => (v ? <Tag color="geekblue">{v}</Tag> : "—"),
    },
    {
      title: "Chu kỳ bảo trì (giờ)",
      dataIndex: "maintenanceIntervalHours",
      key: "maintenanceIntervalHours",
      width: 200,
      align: "center",
      render: (v) => (v === null || v === undefined ? "—" : v),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
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
    <Card
      title="Quản lý danh mục thiết bị"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCategories}>
            Làm mới
          </Button>
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
      }
    >
      {/* Filter bar */}
      <Space
        style={{
          marginBottom: 12,
          display: "flex",
          flexWrap: "wrap",
          rowGap: 8,
        }}
      >
        <Input
          placeholder="Tìm theo tên | mã danh mục…"
          allowClear
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          style={{ width: 280 }}
          prefix={<FilterOutlined />}
        />

        <InputNumber
          placeholder="Chu kỳ tối thiểu"
          min={0}
          value={minHours}
          onChange={setMinHours}
          style={{ width: 160 }}
        />
        <InputNumber
          placeholder="Chu kỳ tối đa"
          min={0}
          value={maxHours}
          onChange={setMaxHours}
          style={{ width: 160 }}
        />

        <Select
          value={sortField}
          onChange={setSortField}
          style={{ width: 180 }}
          options={[
            { value: "name", label: "Sắp xếp theo tên" },
            { value: "hours", label: "Sắp xếp theo chu kỳ" },
          ]}
        />
        <Select
          value={sortOrder}
          onChange={setSortOrder}
          style={{ width: 140 }}
          options={[
            { value: "asc", label: "Tăng dần" },
            { value: "desc", label: "Giảm dần" },
          ]}
        />

        <Button
          icon={<ClearOutlined />}
          onClick={() => {
            setKw("");
            setMinHours(undefined);
            setMaxHours(undefined);
            setSortField("name");
            setSortOrder("asc");
          }}
        >
          Bỏ lọc
        </Button>

        <div style={{ opacity: 0.7 }}>
          Hiển thị {dataView.length}/{categories.length}
        </div>

        <Select
          value={pageSize}
          onChange={setPageSize}
          style={{ marginLeft: "auto", width: 140 }}
          options={[
            { value: 5, label: "5 / trang" },
            { value: 8, label: "8 / trang" },
            { value: 10, label: "10 / trang" },
            { value: 20, label: "20 / trang" },
          ]}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={dataView}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize }}
        bordered
        size="middle"
        scroll={{ x: 720 }}
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
