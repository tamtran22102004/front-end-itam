// src/pages/AttributeConfigPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Text } = Typography;
const API_URL = import.meta.env.VITE_BACKEND_URL;

// ——— helpers ———
const shortId = (id) =>
  id ? `${String(id).slice(0, 8)}…${String(id).slice(-4)}` : "—";

const normalize = (arr) =>
  (arr || [])
    .map((r) => ({
      AttributeID: r.AttributeID,
      IsRequired: Number(r.IsRequired) ? 1 : 0,
      DisplayOrder: Number(r.DisplayOrder) || 0,
    }))
    .sort((a, b) => Number(a.AttributeID) - Number(b.AttributeID));

// ——— Summary (phong cách HistorySummary) ———
function AttributeSummary({ total, requiredCount, unitCount }) {
  const cards = [
    { label: "Tổng thuộc tính", value: total, color: "#1677ff" },
    { label: "Bắt buộc", value: requiredCount, color: "#52c41a" },
    { label: "Không bắt buộc", value: Math.max(total - requiredCount, 0), color: "#faad14" },
    { label: "Số đơn vị đo", value: unitCount, color: "#722ed1" },
  ];
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 8 }}>
      {cards.map((c) => (
        <Col key={c.label} xs={12} sm={8} md={6} lg={6}>
          <Card size="small">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Tag color={c.color} style={{ marginRight: 6 }}>{c.label}</Tag>
              <span style={{ fontWeight: 700 }}>{c.value}</span>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

// ——— Filters (phong cách HistoryFilters) ———
function AttributeFilters({
  categories,
  categoryId,
  setCategoryId,
  kw,
  setKw,
  onlyReq,
  setOnlyReq,
  sortByOrder,
  setSortByOrder,
  rightExtra,
  onClearAll,
}) {
  return (
    <div
      style={{
        marginBottom: 12,
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <Space wrap>
        <Select
          placeholder="Chọn danh mục"
          style={{ width: 300 }}
          options={categories}
          value={categoryId}
          onChange={setCategoryId}
          showSearch
          optionFilterProp="label"
        />
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên/đơn vị đo…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          style={{ width: 300 }}
        />
        <Checkbox checked={onlyReq} onChange={(e) => setOnlyReq(e.target.checked)}>
          Chỉ hiển thị bắt buộc
        </Checkbox>
        <Checkbox checked={sortByOrder} onChange={(e) => setSortByOrder(e.target.checked)}>
          Sắp theo thứ tự (DisplayOrder)
        </Checkbox>
        <Button icon={<CloseCircleOutlined />} onClick={onClearAll}>
          Xóa lọc
        </Button>
      </Space>

      {rightExtra}
    </div>
  );
}

export default function AttributeConfigPage() {
  // ——— state ———
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);

  const [rows, setRows] = useState([]); // working data
  const [originalRows, setOriginalRows] = useState([]); // snapshot để so diff
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // filters
  const [kw, setKw] = useState("");
  const [onlyReq, setOnlyReq] = useState(false);
  const [sortByOrder, setSortByOrder] = useState(true);

  // ——— fetchers ———
  const loadCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/category`);
      const raw = Array.isArray(res.data?.data)
        ? res.data.data
        : Object.values(res.data?.data || {});
      setCategories(raw.map((c) => ({ value: c.ID, label: c.Name })));
    } catch (e) {
      console.error(e);
      message.error("Không tải được danh mục");
    }
  };

  const loadConfig = async (cid) => {
    if (!cid) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/category/${cid}/attribute-config`);
      const data = res.data?.data || [];
      setRows(data);
      setOriginalRows(data);
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Không tải được cấu hình thuộc tính");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { if (categoryId) loadConfig(categoryId); }, [categoryId]);

  // ——— filter + sort ———
  const filteredRows = useMemo(() => {
    let list = rows;

    const q = kw.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.AttributeName || "").toLowerCase().includes(q) ||
          (r.MeasurementUnit || "").toLowerCase().includes(q)
      );
    }

    if (onlyReq) list = list.filter((r) => Number(r.IsRequired) === 1);

    if (sortByOrder) {
      list = [...list].sort(
        (a, b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0)
      );
    }

    return list;
  }, [rows, kw, onlyReq, sortByOrder]);

  // ——— summary numbers ———
  const total = rows.length;
  const requiredCount = rows.reduce((acc, r) => acc + (Number(r.IsRequired) ? 1 : 0), 0);
  const unitCount = new Set(rows.map((r) => (r.MeasurementUnit || "").trim()).filter(Boolean)).size;

  // ——— dirty check ———
  const isDirty = JSON.stringify(normalize(rows)) !== JSON.stringify(normalize(originalRows));

  // ——— columns (phong cách HistoryTable: ID copyable, Tag đơn vị đo) ———
  const columns = [
    {
      title: "Thuộc tính",
      key: "attr",
      render: (_, r) => (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600 }}>{r.AttributeName || "—"}</span>
          <Space size={6}>
            <Tooltip title={r.AttributeID}>
              
            </Tooltip>
          </Space>
        </div>
      ),
      sorter: (a, b) => (a.AttributeName || "").localeCompare(b.AttributeName || ""),
      defaultSortOrder: sortByOrder ? undefined : "ascend",
    },
    {
      title: "Đơn vị đo",
      dataIndex: "MeasurementUnit",
      key: "MeasurementUnit",
      width: 180,
      sorter: (a, b) => (a.MeasurementUnit || "").localeCompare(b.MeasurementUnit || ""),
      render: (v) => (v ? <Tag>{v}</Tag> : <span style={{ color: "#999" }}>—</span>),
      filters: Array.from(
        new Set(rows.map((r) => (r.MeasurementUnit || "").trim()).filter(Boolean))
      ).map((u) => ({ text: u, value: u })),
      onFilter: (val, r) => (r.MeasurementUnit || "") === val,
    },
    {
      title: "Bắt buộc",
      dataIndex: "IsRequired",
      key: "IsRequired",
      width: 130,
      render: (_, record) => (
        <Checkbox
          checked={Boolean(Number(record.IsRequired))}
          onChange={(e) => {
            const checked = e.target.checked;
            setRows((prev) =>
              prev.map((r) =>
                r.AttributeID === record.AttributeID
                  ? { ...r, IsRequired: checked ? 1 : 0 }
                  : r
              )
            );
          }}
        />
      ),
    },
    {
      title: "Thứ tự",
      dataIndex: "DisplayOrder",
      key: "DisplayOrder",
      width: 140,
      sorter: (a, b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0),
      render: (_, record) => (
        <InputNumber
          min={0}
          value={Number(record.DisplayOrder) || 0}
          onChange={(val) => {
            setRows((prev) =>
              prev.map((r) =>
                r.AttributeID === record.AttributeID
                  ? { ...r, DisplayOrder: Number(val) || 0 }
                  : r
              )
            );
          }}
          style={{ width: "100%" }}
        />
      ),
    },
  ];

  // ——— actions ———
  const handleSave = async () => {
    if (!categoryId) return message.warning("Hãy chọn danh mục trước.");
    if (!isDirty) return message.info("Không có thay đổi để lưu.");

    setSaving(true);
    try {
      const payload = {
        mappings: rows.map((r) => ({
          AttributeID: r.AttributeID,
          IsRequired: Number(r.IsRequired) ? 1 : 0,
          DisplayOrder: Number(r.DisplayOrder) || 0,
        })),
      };
      await axios.post(`${API_URL}/api/category/${categoryId}/attribute-config`, payload);
      message.success("Đã lưu cấu hình.");
      await loadConfig(categoryId); // refresh + reset dirty
    } catch (e) {
      console.error(e);
      message.error(e.response?.data?.message || "Lưu cấu hình thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetLocal = () => {
    setRows(originalRows);
    setKw("");
    setOnlyReq(false);
    setSortByOrder(true);
  };

  // ——— rightExtra giống AssetHistoryPage ———
  const rightExtra = (
    <span style={{ opacity: 0.7 }}>
      {filteredRows.length} / {rows.length} thuộc tính
    </span>
  );

  return (
    <Card
      title={
        <Space>
          Cấu hình thuộc tính theo danh mục
          <Badge count={filteredRows.length} style={{ backgroundColor: "#1677ff" }} />
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => categoryId && loadConfig(categoryId)} loading={loading}>
            Làm mới
          </Button>
        </Space>
      }
      bodyStyle={{ padding: 14 }}
      style={{ borderRadius: 10 }}
    >
      {/* Summary */}
      <AttributeSummary total={total} requiredCount={requiredCount} unitCount={unitCount} />

      {/* Filters */}
      <AttributeFilters
        categories={categories}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        kw={kw}
        setKw={setKw}
        onlyReq={onlyReq}
        setOnlyReq={setOnlyReq}
        sortByOrder={sortByOrder}
        setSortByOrder={setSortByOrder}
        rightExtra={rightExtra}
        onClearAll={() => {
          setKw("");
          setOnlyReq(false);
          setSortByOrder(true);
        }}
      />

      {/* Table */}
      <Table
        rowKey="AttributeID"
        dataSource={filteredRows}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        bordered
        size="middle"
        scroll={{ x: 900 }}
        locale={{
          emptyText: (
            <Empty description={categoryId ? "Không có dữ liệu" : "Chọn danh mục để xem cấu hình"} />
          ),
        }}
      />

      {/* Footer actions (giống pattern các page) */}
      <Space style={{ marginTop: 8 }}>
        <Button onClick={handleResetLocal} disabled={!isDirty}>
          Hoàn tác thay đổi
        </Button>
        <Button type="primary" onClick={handleSave} loading={saving} disabled={!categoryId || !isDirty}>
          Lưu cấu hình
        </Button>
      </Space>
    </Card>
  );
}
