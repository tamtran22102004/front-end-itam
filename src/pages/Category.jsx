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
  Tooltip,
  Typography,
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

const { Text } = Typography;

export default function CategoryPage() {
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // ===== Helpers =====
  const getAuth = () => {
    const token = localStorage.getItem("token") || "";
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };
  const shortId = (id) => {
    if (!id && id !== 0) return "—";
    const s = String(id);
    return s.length <= 12 ? s : `${s.slice(0, 8)}…${s.slice(-4)}`;
  };

  // ===== STATE =====
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal form state
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Input.useForm ? Input.useForm() : (() => {
    // antd Input không có useForm; dùng workaround để không lỗi nếu copy nhầm
    return [null];
  })();

  // Filters (client-side)
  const [kw, setKw] = useState("");            // từ khóa: name hoặc code
  const [minHours, setMinHours] = useState();  // lọc min chu kỳ bảo trì
  const [maxHours, setMaxHours] = useState();  // lọc max chu kỳ bảo trì
  const [sortField, setSortField] = useState("name"); // name | hours
  const [sortOrder, setSortOrder] = useState("asc");  // asc | desc
  const [pageSize, setPageSize] = useState(8);

  // ===== API CALLS =====
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/category`, getAuth());
      const arr = Array.isArray(res?.data?.data)
        ? res.data.data
        : Object.values(res?.data?.data || res?.data || {});
      const data = (arr || []).map((item) => ({
        id: item.ID ?? item.id,
        name: item.Name ?? item.name,
        codePrefix: item.CodePrefix ?? item.codePrefix,
        maintenanceIntervalHours:
          item.MaintenanceIntervalHours ?? item.maintenanceIntervalHours ?? null,
      }));
      setCategories(data);
    } catch (err) {
      console.error("❌ Lỗi khi tải danh mục:", err);
      message.error(err?.response?.data?.message || "Không thể tải danh mục!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ===== Modal form model (simple local state) =====
  const [formState, setFormState] = useState({
    name: "",
    codePrefix: "",
    maintenanceIntervalHours: null,
  });

  // mở tạo mới
  const openCreate = () => {
    setEditing(null);
    setFormState({ name: "", codePrefix: "", maintenanceIntervalHours: null });
    setOpenModal(true);
  };

  // mở sửa
  const openEdit = (record) => {
    setEditing(record);
    setFormState({
      name: record.name ?? "",
      codePrefix: record.codePrefix ?? "",
      maintenanceIntervalHours:
        record.maintenanceIntervalHours === null ||
        record.maintenanceIntervalHours === undefined
          ? null
          : Number(record.maintenanceIntervalHours),
    });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
  };

  // ====== SUBMIT: add / update ======
  const onSubmit = async () => {
    const payload = {
      name: (formState.name || "").trim(),
      codePrefix: (formState.codePrefix || "").trim().toUpperCase(),
      maintenanceIntervalHours:
        formState.maintenanceIntervalHours === null ||
        formState.maintenanceIntervalHours === undefined ||
        formState.maintenanceIntervalHours === ""
          ? null
          : Number(formState.maintenanceIntervalHours),
    };

    if (!payload.name) {
      message.warning("Vui lòng nhập tên danh mục hợp lệ");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await axios.post(
          `${API_URL}/api/category/update/${editing.id}`,
          { id: editing.id, ...payload },
          getAuth()
        );
        message.success("Cập nhật danh mục thành công!");
      } else {
        await axios.post(`${API_URL}/api/category/add`, payload, getAuth());
        message.success("Thêm danh mục thành công!");
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      console.error("❌ Lỗi khi lưu danh mục:", err);
      message.error(err?.response?.data?.message || "Không thể lưu danh mục!");
    } finally {
      setSaving(false);
    }
  };

  // ====== Xóa danh mục ======
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/category/delete/${id}`, getAuth());
      message.success("Xóa danh mục thành công!");
      fetchCategories();
    } catch (err) {
      console.error("❌ Lỗi khi xóa danh mục:", err);
      message.error(err?.response?.data?.message || "Không thể xóa danh mục!");
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

  // ====== TABLE COLUMNS (đồng bộ style như các page khác) ======
  const columns = [
    {
      title: "Danh mục",
      key: "name",
      ellipsis: true,
      render: (_, r) => (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600 }}>{r.name || "—"}</span>
          <Space size={6}>
            <Tooltip title={r.id}>
              
            </Tooltip>
          </Space>
        </div>
      ),
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
      defaultSortOrder: "ascend",
    },
    {
      title: "Mã danh mục",
      dataIndex: "codePrefix",
      key: "codePrefix",
      width: 180,
      render: (v) => (v ? <Tag color="geekblue">{v}</Tag> : "—"),
      sorter: (a, b) => (a.codePrefix || "").localeCompare(b.codePrefix || ""),
      filters: Array.from(
        new Set(categories.map((x) => (x.codePrefix || "").trim()).filter(Boolean))
      ).map((u) => ({ text: u, value: u })),
      onFilter: (val, r) => (r.codePrefix || "") === val,
    },
    {
      title: "Chu kỳ bảo trì (giờ)",
      dataIndex: "maintenanceIntervalHours",
      key: "maintenanceIntervalHours",
      width: 220,
      align: "center",
      render: (v) => (v === null || v === undefined || v === "" ? "—" : v),
      sorter: (a, b) => {
        const av = a.maintenanceIntervalHours ?? Number.POSITIVE_INFINITY;
        const bv = b.maintenanceIntervalHours ?? Number.POSITIVE_INFINITY;
        return av - bv;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
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

  return (
    <Card
      title="Quản lý danh mục thiết bị"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCategories} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm danh mục
          </Button>
        </Space>
      }
      bodyStyle={{ padding: 14 }}
      style={{ borderRadius: 10 }}
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

      {/* Table */}
      <Table
        columns={columns}
        dataSource={dataView}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize }}
        bordered
        size="middle"
        scroll={{ x: 900 }}
      />

      {/* Modal Add/Edit (inline, không dùng CategoryForm) */}
      <ModalLike
        open={openModal}
        title={editing ? "Cập nhật danh mục" : "Thêm danh mục"}
        confirmLoading={saving}
        onCancel={closeModal}
        onOk={onSubmit}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Tên danh mục <span style={{ color: "#ff4d4f" }}>*</span></div>
            <Input
              placeholder="VD: Laptop, Màn hình…"
              value={formState.name}
              onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
              onPressEnter={onSubmit}
            />
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Mã danh mục</div>
            <Input
              placeholder="VD: LAP, MON…"
              value={formState.codePrefix}
              onChange={(e) => setFormState((s) => ({ ...s, codePrefix: e.target.value }))}
              onBlur={() =>
                setFormState((s) => ({ ...s, codePrefix: (s.codePrefix || "").toUpperCase() }))
              }
              maxLength={10}
            />
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Chu kỳ bảo trì (giờ)</div>
            <InputNumber
              placeholder="VD: 720 (30 ngày)"
              min={0}
              value={
                formState.maintenanceIntervalHours === null ||
                formState.maintenanceIntervalHours === undefined
                  ? null
                  : Number(formState.maintenanceIntervalHours)
              }
              onChange={(v) =>
                setFormState((s) => ({ ...s, maintenanceIntervalHours: v }))
              }
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {editing ? (
          <div style={{ marginTop: 10, opacity: 0.7 }}>
            <Text type="secondary">Đang sửa:</Text>{" "}
            <Text code>{shortId(editing.id)}</Text>
          </div>
        ) : null}
      </ModalLike>
    </Card>
  );
}

/**
 * ModalLike: 1 modal siêu gọn dùng ngay (tránh phụ thuộc Antd Form)
 * Bạn có thể thay bằng antd Modal nếu muốn giữ style/animation mặc định.
 */
function ModalLike({ open, title, children, onOk, onCancel, confirmLoading }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 520,
          maxWidth: "100%",
          background: "#fff",
          borderRadius: 10,
          boxShadow:
            "0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12), 0 9px 28px 8px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", fontWeight: 600 }}>
          {title}
        </div>
        <div style={{ padding: 16 }}>{children}</div>
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" onClick={onOk} loading={confirmLoading}>
            Lưu
          </Button>
        </div>
      </div>
    </div>
  );
}
