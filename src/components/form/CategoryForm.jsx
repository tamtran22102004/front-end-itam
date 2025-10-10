// src/components/form/CategoryForm.jsx
import React from "react";
import { Modal, Form, Input, InputNumber, Tooltip, Typography, Space } from "antd";

const { Text } = Typography;

const CategoryForm = ({ open, editing, onCancel, onAdd, onUpdate }) => {
  const [form] = Form.useForm();

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) await onUpdate(values, form);
    else await onAdd(values, form);
  };

  return (
    <Modal
      title={editing ? "✏️ Sửa danh mục" : "➕ Thêm danh mục"}
      open={open}
      onCancel={onCancel}
      onOk={handleSave}
      okText="Lưu"
      cancelText="Hủy"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          editing
            ? {
                name: editing.name,
                codePrefix: editing.codePrefix,
                maintenanceIntervalHours: editing.maintenanceIntervalHours,
              }
            : { maintenanceIntervalHours: null }
        }
      >
        <Form.Item
          label="Tên danh mục"
          name="name"
          rules={[
            { required: true, message: "Vui lòng nhập tên danh mục!" },
            { min: 2, message: "Tên tối thiểu 2 ký tự." },
            { max: 100, message: "Tên tối đa 100 ký tự." },
          ]}
          tooltip="Ví dụ: Laptop, PC, Máy in"
        >
          <Input
            placeholder="Nhập tên danh mục (VD: Laptop)"
            allowClear
            onChange={(e) =>
              form.setFieldsValue({
                name: (e.target.value || "").toUpperCase(),
              })
            }
          />
        </Form.Item>

        <Form.Item
          label={
            <Space>
              <span>Mã danh mục</span>
              <Tooltip title="Chỉ chữ & số, 1–10 ký tự.">
                <Text type="secondary">(gợi ý)</Text>
              </Tooltip>
            </Space>
          }
          name="codePrefix"
          rules={[
            { required: true, message: "Vui lòng nhập code prefix!" },
            {
              pattern: /^[A-Za-z0-9]{1,10}$/,
              message: "Chỉ chữ & số, 1–10 ký tự.",
            },
          ]}
        >
          <Input
            placeholder="VD: CAT"
            maxLength={10}
            onChange={(e) =>
              form.setFieldsValue({
                codePrefix: (e.target.value || "").toUpperCase(),
              })
            }
          />
        </Form.Item>

        <Form.Item
          label="Chu kỳ bảo trì (giờ)"
          name="maintenanceIntervalHours"
          tooltip="Không bắt buộc. Để trống nếu không dùng."
          rules={[
            () => ({
              validator(_, value) {
                if (value === null || value === "" || value === undefined)
                  return Promise.resolve();
                if (Number.isInteger(value) && value >= 0)
                  return Promise.resolve();
                return Promise.reject(
                  new Error("Vui lòng nhập số nguyên không âm hoặc để trống.")
                );
              },
            }),
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            placeholder="Nhập số giờ (không bắt buộc)"
            min={0}
            controls
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CategoryForm;
