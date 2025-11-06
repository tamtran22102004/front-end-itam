// src/components/assets/AssetFormModal.jsx
import React from "react";
import {
  Button,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { CopyOutlined } from "@ant-design/icons";

const { Option } = Select;
const { Text } = Typography;

export default function AssetFormModal({
  open,
  onCancel,
  onSubmit,
  editingAsset,
  categories = [],
  itemMasters = [],
  vendors = [],
  getIMById = () => null,
  currentManageType,
  setCurrentManageType = () => {},
  STATUS_OPTIONS = [],
}) {
  const [form] = Form.useForm();

  const handleItemMasterChange = (id) => {
    const im = getIMById?.(id);
    if (im) {
      if (im.CategoryID) form.setFieldsValue({ CategoryID: im.CategoryID });
      setCurrentManageType(im.ManageType || null);
      if (im.ManageType === "INDIVIDUAL") form.setFieldsValue({ Quantity: 1 });
    } else {
      setCurrentManageType(null);
    }
    form.setFieldsValue({ ItemMasterID: id });
  };

  const onWarrantyMonthsChange = () => {
    const start = form.getFieldValue("WarrantyStartDate");
    const months = form.getFieldValue("WarrantyMonth");
    if (start && months != null) {
      const end = dayjs(start).add(Number(months || 0), "month");
      form.setFieldsValue({ WarrantyEndDate: end });
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const initialValues = { Quantity: 1, Status: 1 };
  const recordWithDayjs = editingAsset
    ? {
        ...editingAsset,
        QRCode: editingAsset.QRCode ?? null,
        PurchaseDate: editingAsset.PurchaseDate ? dayjs(editingAsset.PurchaseDate) : null,
        WarrantyStartDate: editingAsset.WarrantyStartDate ? dayjs(editingAsset.WarrantyStartDate) : null,
        WarrantyEndDate: editingAsset.WarrantyEndDate ? dayjs(editingAsset.WarrantyEndDate) : null,
      }
    : initialValues;

  return (
    <Drawer
      open={open}
      onClose={onCancel}
      placement="right"
      width={820}
      destroyOnClose
      title={
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 16 }}>
            {editingAsset ? "Cập nhật Asset" : "Thêm Asset mới"}
          </Text>
          {editingAsset?.ID ? (
            <Text type="secondary">
              ID:&nbsp;
              <code
                style={{
                  background: "#f5f5f5",
                  border: "1px solid #eee",
                  borderRadius: 6,
                  padding: "2px 6px",
                  color: "#555",
                }}
              >
                {String(editingAsset.ID).slice(0, 8)}…{String(editingAsset.ID).slice(-4)}
              </code>
            </Text>
          ) : null}
        </Space>
      }
      afterOpenChange={(opened) => {
        if (opened) {
          form.resetFields();
          form.setFieldsValue(recordWithDayjs);
        }
      }}
      styles={{
        body: { paddingTop: 8, paddingBottom: 0 },
        header: { borderBottom: "1px solid #f0f0f0" },
      }}
      extra={
        editingAsset?.QRCode ? (
          <Button
            size="small"
            type="text"
            icon={<CopyOutlined />}
            onClick={() => copy(editingAsset?.QRCode)}
          >
            Copy QR
          </Button>
        ) : null
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(vals) => onSubmit(vals)}
        initialValues={initialValues}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item
            label="Tên thiết bị"
            name="Name"
            rules={[{ required: true, message: "Nhập tên thiết bị" }]}
          >
            <Input allowClear />
          </Form.Item>

          <Form.Item
            label="Mã quản lý nội bộ"
            name="ManageCode"
            rules={[{ required: true, message: "Nhập mã quản lý nội bộ" }]}
          >
            <Input allowClear />
          </Form.Item>

          <Form.Item label="Mã tài sản kế toán" name="AssetCode">
            <Input allowClear />
          </Form.Item>

          <Form.Item
            label="Danh mục"
            name="CategoryID"
            rules={[{ required: true, message: "Chọn danh mục" }]}
          >
            <Select showSearch allowClear placeholder="Chọn danh mục" optionFilterProp="children">
              {(categories || []).map((c) => (
                <Option key={c.ID} value={c.ID}>
                  {c.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Thuộc dòng ItemMaster" name="ItemMasterID">
            <Select
              showSearch
              allowClear
              placeholder="Chọn ItemMaster"
              optionFilterProp="children"
              onChange={handleItemMasterChange}
            >
              {(itemMasters || []).map((i) => (
                <Option key={i.ID} value={i.ID}>
                  {i.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Nhà cung cấp" name="VendorID">
            <Select showSearch allowClear placeholder="Chọn Vendor" optionFilterProp="children">
              {(vendors || []).map((v) => (
                <Option key={v.ID} value={v.ID}>
                  {v.Name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Ngày mua" name="PurchaseDate">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Giá mua" name="PurchasePrice">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Mã phiếu mua" name="PurchaseId">
            <Input allowClear />
          </Form.Item>

          {/* QRCode giữ nguyên token khi update */}
          <Form.Item
            label="Nội dung QR (QRToken)"
            name="QRCode"
            tooltip="Giữ nguyên để bảo toàn QR hiện có. Xoá trắng để xoá QR."
          >
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => (
                <Input
                  allowClear
                  placeholder="VD: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  suffix={
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copy(getFieldValue("QRCode") || "")}
                    />
                  }
                />
              )}
            </Form.Item>
          </Form.Item>

          <Form.Item label="Ngày BH bắt đầu" name="WarrantyStartDate">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" onChange={onWarrantyMonthsChange} />
          </Form.Item>

          <Form.Item
            label="Ngày kết thúc BH"
            name="WarrantyEndDate"
            dependencies={["WarrantyStartDate"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const start = getFieldValue("WarrantyStartDate");
                  if (!value || !start) return Promise.resolve();
                  if (dayjs(value).isBefore(dayjs(start), "day"))
                    return Promise.reject(new Error("EndDate phải ≥ StartDate"));
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Tổng tháng bảo hành" name="WarrantyMonth">
            <InputNumber min={0} style={{ width: "100%" }} onChange={onWarrantyMonthsChange} />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) =>
              prev.ItemMasterID !== curr.ItemMasterID || prev.Quantity !== curr.Quantity
            }
          >
            {({ getFieldValue, setFieldsValue }) => {
              const imId = getFieldValue("ItemMasterID");
              const im = imId ? getIMById(imId) : null;
              const manageType = im?.ManageType || currentManageType || null;
              if (manageType === "INDIVIDUAL" && getFieldValue("Quantity") !== 1) {
                setFieldsValue({ Quantity: 1 });
              }
              return (
                <>
                  <Form.Item
                    label={
                      <Space>
                        SerialNumber{" "}
                        {manageType === "INDIVIDUAL" && <Tag color="purple">INDIVIDUAL</Tag>}
                      </Space>
                    }
                    name="SerialNumber"
                    rules={
                      manageType === "INDIVIDUAL"
                        ? [{ required: true, message: "Nhập SerialNumber cho thiết bị INDIVIDUAL" }]
                        : []
                    }
                  >
                    <Input allowClear placeholder="VD: SN12345" />
                  </Form.Item>

                  {manageType === "INDIVIDUAL" ? (
                    <Form.Item label="Số lượng" name="Quantity" initialValue={1}>
                      <InputNumber min={1} style={{ width: "100%" }} disabled />
                    </Form.Item>
                  ) : (
                    <Form.Item label="Số lượng" name="Quantity" initialValue={1}>
                      <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>
                  )}
                </>
              );
            }}
          </Form.Item>

          <Form.Item label="Trạng thái" name="Status" initialValue={1}>
            <Select>
              {(STATUS_OPTIONS || []).map(({ value, label }) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* Sticky footer trong Drawer */}
        <Divider style={{ margin: "10px 0 8px" }} />
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: "#fff",
            padding: "8px 0 0",
            textAlign: "right",
          }}
        >
          <Space>
            <Button onClick={onCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              {editingAsset ? "Cập nhật" : "Lưu"}
            </Button>
          </Space>
        </div>
      </Form>
    </Drawer>
  );
}
