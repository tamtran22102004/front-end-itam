import React from "react";
import { Modal, Form, Input } from "antd";

const AttributeForm = ({ open, editing, onCancel, onAdd, onUpdate }) => {
  const [form] = Form.useForm();

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) await onUpdate(values, form);
    else await onAdd(values, form);
  };

  return (
    <Modal
      title={editing ? "✏️ Sửa thuộc tính" : "➕ Thêm thuộc tính"}
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
                name: editing.Name,
                measurementUnit: editing.MeasurementUnit,
              }
            : {}
        }
      >
        <Form.Item
          label="Tên thuộc tính"
          name="name"
          rules={[{ required: true, message: "Vui lòng nhập tên thuộc tính" }]}
        >
          <Input placeholder="VD: Kích thước, Dung lượng, Màu sắc..." />
        </Form.Item>
        <Form.Item label="Đơn vị đo" name="measurementUnit">
          <Input placeholder="VD: cm, GB, inch..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AttributeForm;
