// src/pages/AttributePage.jsx
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
  Tag,
  Tooltip,
  Typography,
  Empty,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Text } = Typography;
const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/attribute`;

// Rút gọn ID hiển thị như HistoryTable
const shortId = (id) => {
  if (!id && id !== 0) return "—";
  const s = String(id);
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
};

// Chuẩn hoá 1 row bất kể BE trả key kiểu gì
const normalizeRow = (r) => ({
  ID: r?.ID ?? r?.id ?? r?.Id ?? r?.attributeId ?? r?.AttributeID,
  Name: r?.Name ?? r?.name ?? r?.NAME ?? "",
  MeasurementUnit:
    r?.MeasurementUnit ?? r?.measurementUnit ?? r?.measurementunit ?? "",
});

const normalizeList = (raw) => {
  const arr = Array.isArray(raw) ? raw : Object.values(raw || {});
  return arr.map(normalizeRow);
};

export default function AttributePage() {
  const [form] = Form.useForm();

  // ===== State =====
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Table
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // Filter bar
  const [kw, setKw] = useState("");
  const [unit, setUnit] = useState(null);

  // ===== Helpers =====
  const getAuth = () => {
    const token = localStorage.getItem("token") || "";
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  // ===== API =====
  const fetchAttributes = async () => {
    setLoading(true);
    try {
      // Chuẩn route chính: GET /api/attribute
      let res = await axios.get(`${API_BASE}/attributeDetail`, getAuth());
      let raw = res?.data?.data ?? res?.data;
      let data = normalizeList(raw);

      // Fallback nếu backend cũ dùng /attributeDetail
      if (!data.length) {
        const res2 = await axios.get(`${API_BASE}/attributeDetail`, getAuth());
        const raw2 = res2?.data?.data ?? res2?.data;
        data = normalizeList(raw2);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Unit options =====
  const unitOptions = useMemo(() => {
    const set = new Set(
      (attributes || [])
        .map((a) => (a?.MeasurementUnit || "").trim())
        .filter(Boolean)
    );
    return Array.from(set);
  }, [attributes]);

  // ===== Filtered data =====
  const filteredData = useMemo(() => {
    const q = kw.trim().toLowerCase();
    return (attributes || []).filter((a) => {
      const name = (a?.Name || "").toLowerCase();
      const mu = (a?.MeasurementUnit || "").toLowerCase();
      const byKw = !q ? true : name.includes(q) || mu.includes(q);
      const byUnit = !unit ? true : (a?.MeasurementUnit || "") === unit;
      return byKw && byUnit;
    });
  }, [attributes, kw, unit]);

  // Reset trang khi đổi filter
  useEffect(() => {
    setPagination((p) => ({ ...p, current: 1 }));
  }, [kw, unit]);

  // ===== Modal mở -> đổ form =====
  useEffect(() => {
    if (!openModal) return;
    if (editing) {
      form.setFieldsValue({
        Name: editing.Name ?? "",
        MeasurementUnit: editing.MeasurementUnit || undefined,
      });
    } else {
      form.resetFields();
    }
  }, [openModal, editing, form]);

  // ===== Submit (add / update) =====
  const onFinish = async (values) => {
    const payload = {
      name: values?.Name?.trim(),
      // Tránh gửi null nếu DB NOT NULL
      measurementUnit: values?.MeasurementUnit?.trim() || "",
    };

    if (!payload.name) {
      message.warning("Vui lòng nhập tên thuộc tính hợp lệ");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const id = editing.ID ?? editing.id;
        if (!id) {
          message.error("Không xác định được ID bản ghi để cập nhật");
          return;
        }
        await axios.post(`${API_BASE}/update/${id}`, payload, getAuth());
        message.success("Cập nhật thuộc tính thành công");
      } else {
        await axios.post(`${API_BASE}/add`, payload, getAuth());
        message.success("Thêm thuộc tính thành công");
      }
      setOpenModal(false);
      setEditing(null);
      form.resetFields();
      fetchAttributes();
    } catch (err) {
      console.error(err);
      message.error(
        err?.response?.data?.message ||
          "Không thể lưu thuộc tính. Vui lòng thử lại."
      );
    } finally {
      setSaving(false);
    }
  };

  // ===== Delete =====
  const handleDelete = async (record) => {
    const id = record?.ID ?? record?.id;
    if (!id) return message.error("Không xác định được ID để xoá");
    try {
      await axios.delete(`${API_BASE}/delete/${id}`, getAuth());
      message.success("Đã xoá thuộc tính");
      fetchAttributes();
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || "Xoá thất bại.");
    }
  };

  // ===== Columns (phong cách HistoryTable) =====
  const columns = [
    {
      title: "Thuộc tính",
      key: "attr",
      width: 360,
      sorter: (a, b) => (a.Name || "").localeCompare(b.Name || ""),
      defaultSortOrder: "ascend",
      render: (_, r) => (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600 }}>{r.Name || "—"}</span>
          <Space size={6}>
            <Tooltip title={r.ID}>
            </Tooltip>
            {/* Có thể chèn nút điều hướng khác nếu cần sau này */}
          </Space>
        </div>
      ),
    },
    {
      title: "Đơn vị đo",
      dataIndex: "MeasurementUnit",
      key: "MeasurementUnit",
      width: 200,
      sorter: (a, b) =>
        (a.MeasurementUnit || "").localeCompare(b.MeasurementUnit || ""),
      render: (v) =>
        v ? (
          <Tag>{v}</Tag>
        ) : (
          <span style={{ color: "#999" }}>—</span>
        ),
      filters: unitOptions.map((u) => ({ text: u, value: u })),
      onFilter: (val, r) => (r.MeasurementUnit || "") === val,
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="Sửa">
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(record);
                setOpenModal(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Bạn chắc muốn xoá thuộc tính này?"
            okText="Xoá"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
      fixed: "right",
    },
  ];

  // ===== UI helpers =====
  const clearFilters = () => {
    setKw("");
    setUnit(null);
  };

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };

  return (
    <Card
      title="Quản lý Thuộc tính (Attribute)"
      extra={
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchAttributes}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm mới
          </Button>
        </Space>
      }
    >
      {/* Filter bar */}
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

      {/* Table */}
      <Table
        rowKey={(r) => r.ID ?? r.id}
        bordered
        size="middle"
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        pagination={{
          ...pagination,
          total: filteredData.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20"],
        }}
        locale={{
          emptyText: (
            <Empty description="Chưa có thuộc tính nào. Nhấn 'Thêm mới' để tạo." />
          ),
        }}
        scroll={{ x: 900 }}
      />

      {/* Modal Add/Edit */}
      <Modal
        title={editing ? "Cập nhật thuộc tính" : "Thêm thuộc tính mới"}
        open={openModal}
        onCancel={() => {
          setOpenModal(false);
          setEditing(null);
        }}
        footer={null}
        destroyOnClose
        width={520}
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
            rules={[
              { required: true, message: "Vui lòng nhập tên thuộc tính" },
              { max: 100, message: "Tối đa 100 ký tự" },
            ]}
          >
            <Input
              placeholder="VD: RAM, CPU, Kích thước màn hình…"
              autoFocus
              onPressEnter={() => form.submit()}
            />
          </Form.Item>

          <Form.Item
            label="Đơn vị đo"
            name="MeasurementUnit"
            tooltip="Không bắt buộc (VD: GB, GHz, inch…)"
            rules={[{ max: 50, message: "Tối đa 50 ký tự" }]}
          >
            <Input placeholder="VD: GB, Hz, inch…" />
          </Form.Item>

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Button onClick={() => setOpenModal(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ marginLeft: 8 }}
              loading={saving}
            >
              {editing ? "Cập nhật" : "Lưu"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
