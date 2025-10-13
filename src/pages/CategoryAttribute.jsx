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
import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function AttributeConfigPage() {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);

  const [rows, setRows] = useState([]); // [{AttributeID, AttributeName, MeasurementUnit, IsRequired, DisplayOrder}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      ,);
      setRows(res.data?.data || []);
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

  const columns = useMemo(
    () => [
      { title: "ID", dataIndex: "AttributeID", width: 80 },
      { title: "Tên thuộc tính", dataIndex: "AttributeName" },
      { title: "Đơn vị đo", dataIndex: "MeasurementUnit", width: 120 },
      {
        title: "Bắt buộc",
        dataIndex: "IsRequired",
        width: 120,
        render: (_, record) => (
          <Checkbox
            checked={record.IsRequired}
            onChange={(e) => {
              const checked = e.target.checked;
              setRows((prev) =>
                prev.map((r) =>
                  r.AttributeID === record.AttributeID
                    ? { ...r, IsRequired: checked }
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
        width: 140,
        render: (_, record) => (
          <InputNumber
            min={0}
            value={record.DisplayOrder}
            onChange={(val) => {
              setRows((prev) =>
                prev.map((r) =>
                  r.AttributeID === record.AttributeID
                    ? { ...r, DisplayOrder: Number(val) || 0 }
                    : r
                )
              );
            }}
          />
        ),
      },
    ],
    []
  );

  const handleSave = async () => {
    if (!categoryId) return message.warning("Hãy chọn danh mục trước.");
    setSaving(true);
    try {
      const payload = {
        mappings: rows.map((r) => ({
          AttributeID: r.AttributeID,
          IsRequired: r.IsRequired ? 1 : 0,
          DisplayOrder: Number(r.DisplayOrder) || 0,
        })),
      };
      await axios.post(
        `${API_URL}/api/category/${categoryId}/attribute-config`,
        payload
      );
      message.success("Đã lưu cấu hình.");
      await loadConfig(categoryId); // làm mới
    } catch (e) {
      message.error(e.response?.data?.message || "Lưu cấu hình thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Cấu hình thuộc tính theo danh mục">
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Select
          placeholder="Chọn danh mục"
          style={{ width: 300 }}
          options={categories}
          value={categoryId}
          onChange={setCategoryId}
          showSearch
          optionFilterProp="label"
        />

        <Table
          rowKey="AttributeID"
          dataSource={rows}
          columns={columns}
          loading={loading}
          pagination={false}
        />

        <Button
          type="primary"
          onClick={handleSave}
          loading={saving}
          disabled={!categoryId}
        >
          Lưu cấu hình
        </Button>
      </Space>
    </Card>
  );
}
