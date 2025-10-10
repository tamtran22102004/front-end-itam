// src/pages/CategoryAttributePage.jsx
import React, { useState } from "react";
import { Table, Checkbox, InputNumber, Button, Select, message } from "antd";

const HomePage = () => {
  // 🔹 Dữ liệu mẫu Attribute
  const sampleAttributes = [
    { ID: 1, Name: "CPU", MeasurementUnit: "GHz" },
    { ID: 2, Name: "RAM", MeasurementUnit: "GB" },
    { ID: 3, Name: "Storage", MeasurementUnit: "GB" },
    { ID: 4, Name: "Screen", MeasurementUnit: "inch" },
    { ID: 5, Name: "PrintSpeed", MeasurementUnit: "ppm" },
  ];

  // 🔹 Danh mục mẫu
  const categories = [
    { label: "Laptop", value: "L" },
    { label: "Printer", value: "P" },
  ];

  const [attributes, setAttributes] = useState(
    sampleAttributes.map((a) => ({
      ...a,
      isRequired: false,
      order: 0,
    }))
  );

  const [selectedCategory, setSelectedCategory] = useState("");

  // Khi chọn danh mục
  const handleCategoryChange = (value) => {
    setSelectedCategory(value);

    // Reset lại form mỗi khi đổi danh mục
    setAttributes(
      sampleAttributes.map((a) => ({
        ...a,
        isRequired: false,
        order: 0,
      }))
    );
  };

  // Khi nhấn nút Lưu
  const handleSave = () => {
    if (!selectedCategory) {
      message.warning("Vui lòng chọn danh mục trước!");
      return;
    }

    const payload = {
      categoryId: selectedCategory,
      attributes: attributes
        .filter((a) => a.isRequired || a.order > 0)
        .map((a) => ({
          attributeId: a.ID,
          isRequired: a.isRequired ? 1 : 0,
          order: a.order || 0,
        })),
    };

    console.log("✅ Payload gửi lên server:", payload);
    message.success("Giả lập lưu thành công (xem console.log)");
  };

  const columns = [
    { title: "ID", dataIndex: "ID", width: 70 },
    { title: "Tên thuộc tính", dataIndex: "Name" },
    { title: "Đơn vị đo", dataIndex: "MeasurementUnit" },
    {
      title: "Bắt buộc",
      dataIndex: "isRequired",
      render: (value, record) => (
        <Checkbox
          checked={record.isRequired}
          onChange={(e) => {
            record.isRequired = e.target.checked;
            setAttributes([...attributes]);
          }}
        />
      ),
    },
    {
      title: "Thứ tự",
      dataIndex: "order",
      render: (value, record) => (
        <InputNumber
          min={0}
          value={record.order}
          onChange={(val) => {
            record.order = val;
            setAttributes([...attributes]);
          }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>Cấu hình thuộc tính theo danh mục</h2>

      <Select
        placeholder="Chọn danh mục"
        options={categories}
        value={selectedCategory}
        onChange={handleCategoryChange}
        style={{ width: 200, marginBottom: 20 }}
      />

      <Table
        rowKey="ID"
        columns={columns}
        dataSource={attributes}
        pagination={false}
      />

      <Button
        type="primary"
        onClick={handleSave}
        style={{ marginTop: 20 }}
      >
        Lưu cấu hình
      </Button>
    </div>
  );
};

export default HomePage;
