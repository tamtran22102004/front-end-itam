import React, { useEffect, useMemo, useState } from "react";
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
  Select,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Option } = Select;
const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/attribute`;

const AttributePage = () => {
  const [form] = Form.useForm();
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Pagination state tách riêng để control khi lọc
  const [pagination, setPagination] = useState({ current: 1, pageSize: 6 });

  // ====== FILTER STATE (mới) ======
  const [kw, setKw] = useState("");          // từ khóa tìm kiếm
  const [unit, setUnit] = useState(null);    // đơn vị đo được chọn

  // Lấy danh sách thuộc tính
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

  // ====== Tập đơn vị đo duy nhất cho Select filter ======
  const unitOptions = useMemo(() => {
    const set = new Set(
      (attributes || [])
        .map((a) => (a.MeasurementUnit || "").trim())
        .filter(Boolean)
    );
    return Array.from(set);
  }, [attributes]);

  // ====== Áp dụng filter client-side ======
  const filteredData = useMemo(() => {
    const q = kw.trim().toLowerCase();
    return (attributes || []).filter((a) => {
      const byKw = !q
        ? true
        : (a.Name || "").toLowerCase().includes(q) ||
          (a.MeasurementUnit || "").toLowerCase().includes(q);
      const byUnit = !unit ? true : (a.MeasurementUnit || "") === unit;
      return byKw && byUnit;
    });
  }, [attributes, kw, unit]);

  // Reset về trang 1 mỗi khi thay đổi filter
  useEffect(() => {
    setPagination((p) => ({ ...p, current: 1 }));
  }, [kw, unit]);

  // Submit form (add / update)
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

  // Xóa
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
      width: 200,
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

  // Nút bỏ lọc
  const clearFilters = () => {
    setKw("");
    setUnit(null);
  };

  return (
    <Card
      title="Quản lý Thuộc tính (Attribute)"
      extra={
        <Space wrap>
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
      {/* ====== Thanh lọc (filter bar) ====== */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Input.Search
          allowClear
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onSearch={(v) => setKw(v)}
          placeholder="Tìm theo tên hoặc đơn vị đo…"
          style={{ width: 320 }}
        />

        <Select
          allowClear
          value={unit}
          onChange={setUnit}
          placeholder="Lọc theo đơn vị đo"
          style={{ width: 220 }}
          options={unitOptions.map((u) => ({ value: u, label: u }))}
        />

        <Button onClick={clearFilters}>Bỏ lọc</Button>

        <div style={{ marginLeft: "auto", opacity: 0.7 }}>
          Hiển thị {filteredData.length}/{attributes.length}
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <Table
        rowKey="ID"
        bordered
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        pagination={{
          ...pagination,
          total: filteredData.length,
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
