// src/pages/AttributeConfigPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Select,
  Table,
  Checkbox,
  InputNumber,
  Button,
  message,
  Space,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const CategoryAttributePage = () => {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);

  const [rows, setRows] = useState([]);           // working data
  const [originalRows, setOriginalRows] = useState([]); // snapshot để so diff
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ====== FILTER state ======
  const [kw, setKw] = useState("");          // từ khóa
  const [onlyReq, setOnlyReq] = useState(false); // chỉ bắt buộc
  const [sortByOrder, setSortByOrder] = useState(true); // sắp theo DisplayOrder

  // ====== fetchers ======
  const loadCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/category`);
      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : Object.values(res.data?.data || {});
      setCategories(data.map((c) => ({ value: c.ID, label: c.Name })));
    } catch (e) {
      message.error("Không tải được danh sách danh mục");
    }
  };

  const loadConfig = async (cid) => {
    if (!cid) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/category/${cid}/attribute-config`
      );
      const data = res.data?.data || [];
      setRows(data);
      setOriginalRows(data);
    } catch (e) {
      message.error("Không tải được cấu hình thuộc tính");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    if (categoryId) loadConfig(categoryId);
  }, [categoryId]);

  // ====== filter + sort client-side ======
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

    if (onlyReq) {
      list = list.filter((r) => Number(r.IsRequired) === 1);
    }

    if (sortByOrder) {
      list = [...list].sort(
        (a, b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0)
      );
    }

    return list;
  }, [rows, kw, onlyReq, sortByOrder]);

  // ====== dirty check ======
  const normalize = (arr) =>
    (arr || [])
      .map((r) => ({
        AttributeID: r.AttributeID,
        IsRequired: Number(r.IsRequired) ? 1 : 0,
        DisplayOrder: Number(r.DisplayOrder) || 0,
      }))
      .sort((a, b) => a.AttributeID - b.AttributeID);

  const isDirty =
    JSON.stringify(normalize(rows)) !== JSON.stringify(normalize(originalRows));

  // ====== columns ======
  const columns = [
    { title: "ID", dataIndex: "AttributeID", width: 90 },
    { title: "Tên thuộc tính", dataIndex: "AttributeName" },
    { title: "Đơn vị đo", dataIndex: "MeasurementUnit", width: 140 },
    {
      title: "Bắt buộc",
      dataIndex: "IsRequired",
      width: 120,
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
      width: 150,
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

  // ====== actions ======
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
      await axios.post(
        `${API_URL}/api/category/${categoryId}/attribute-config`,
        payload
      );
      message.success("Đã lưu cấu hình.");
      await loadConfig(categoryId); // refresh + reset dirty
    } catch (e) {
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

  return (
    <Card
      title="Cấu hình thuộc tính theo danh mục"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => categoryId && loadConfig(categoryId)}
          >
            Làm mới
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Filter bar */}
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

          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="Tìm theo tên/đơn vị đo…"
            style={{
              width: 280,
              padding: "6px 10px",
              border: "1px solid #d9d9d9",
              borderRadius: 6,
            }}
          />

          <Checkbox checked={onlyReq} onChange={(e) => setOnlyReq(e.target.checked)}>
            Chỉ hiển thị bắt buộc
          </Checkbox>

          <Checkbox
            checked={sortByOrder}
            onChange={(e) => setSortByOrder(e.target.checked)}
          >
            Sắp theo thứ tự
          </Checkbox>

          <Button onClick={handleResetLocal}>Bỏ lọc / Hoàn tác</Button>

          <div style={{ marginLeft: 8, opacity: 0.7 }}>
            Hiển thị {filteredRows.length}/{rows.length}
          </div>
        </Space>

        <Table
          rowKey="AttributeID"
          dataSource={filteredRows}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
          size="middle"
        />

        <Space>
          <Button onClick={handleResetLocal} disabled={!isDirty}>
            Hoàn tác thay đổi
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!categoryId || !isDirty}
          >
            Lưu cấu hình
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default CategoryAttributePage;
